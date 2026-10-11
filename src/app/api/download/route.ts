import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Readable } from "stream";
import { getProvider } from "@/lib/providers";
import { providerErrorMessage } from "@/lib/api-error";

const DOWNLOAD_TIMEOUT = 30000;
const RETRY_LIMIT = 2;
const RETRY_DELAY = 600;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown) {
  const err = error as { code?: string; message?: string };
  const code = err?.code || "";
  const message = err?.message || "";
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    message.toLowerCase().includes("timeout")
  );
}

function parseExtra(value: string | null) {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function requestAudioStream(url: string, attempt = 0) {
  try {
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: DOWNLOAD_TIMEOUT,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      response.data.destroy();
      throw new Error(`Upstream error: ${response.status}`);
    }

    if (/^(application\/json|text\/)/i.test(String(response.headers['content-type'] || ''))) {
      response.data.destroy();
      throw new Error('渠道未返回有效音频，请重试或切换渠道');
    }

    const stream = Readable.toWeb(response.data) as ReadableStream<Uint8Array>;
    return { stream, headers: response.headers as Record<string, string | undefined> };
  } catch (error) {
    if (attempt < RETRY_LIMIT && isRetryableError(error)) {
      await delay(RETRY_DELAY * (attempt + 1));
      return requestAudioStream(url, attempt + 1);
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const filename = searchParams.get("filename");
  const providerName = searchParams.get("provider") || "netease";
  const extra = parseExtra(searchParams.get("extra"));

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    // 1. 获取真实播放地址
    const provider = getProvider(providerName);
    const playInfo = await provider.getPlayInfo(id, extra);
    if (!playInfo || !playInfo.url) {
      return NextResponse.json({ error: "Failed to get url" }, { status: 404 });
    }

    const downloadEnabled = process.env.ENABLE_DOWNLOAD !== "0";
    if (!downloadEnabled) {
      return NextResponse.json(
        { error: "Download disabled", url: playInfo.url },
        { status: 503 }
      );
    }

    // 2. 请求音频流
    // 使用原生 fetch 以获取标准的 ReadableStream，完美兼容 NextResponse
    const { stream, headers: upstreamHeaders } = await requestAudioStream(playInfo.url);

    // 3. 构建响应头
    const headers = new Headers();
    const contentType = upstreamHeaders["content-type"];
    headers.set("Content-Type", contentType || "audio/mpeg");

    const contentLength = upstreamHeaders["content-length"];
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    
    // 设置下载文件名
    const safeFilename = filename 
      ? encodeURIComponent(filename).replace(/%20/g, '+')
      : `music-${id}.mp3`;
      
    headers.set("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);

    // 4. 返回流
    return new NextResponse(stream, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: providerErrorMessage(error) }, { status: 502 });
  }
}
