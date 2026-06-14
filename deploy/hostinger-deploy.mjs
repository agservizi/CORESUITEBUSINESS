#!/usr/bin/env node
/**
 * Hostinger Node.js deploy (official 3-step flow used by hostinger-api-mcp).
 * 1) POST /api/hosting/v1/files/upload-urls
 * 2) TUS upload to file storage
 * 3) POST /api/hosting/v1/accounts/{user}/websites/{domain}/nodejs/builds
 */
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import tus from "tus-js-client";

const API_BASE = "https://developers.hostinger.com/";

function getArg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const username = getArg("--username", "u427445037");
const domain = getArg("--domain", "business.coresuite.it");
const archivePath = getArg("--archive");
const token = getArg("--token", process.env.HAPI_API_TOKEN || process.env.HOSTINGER_API_TOKEN);
const nodeVersion = Number(getArg("--node-version", "22"));
const buildScript = getArg("--build-script", "build");
const packageManager = getArg("--package-manager", "npm");

if (!archivePath || !fs.existsSync(archivePath)) {
  console.error("Missing --archive");
  process.exit(1);
}
if (!token) {
  console.error("Missing API token");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "hostinger-cli/1.0.0",
};

async function fetchUploadCredentials() {
  const url = new URL("api/hosting/v1/files/upload-urls", API_BASE).toString();
  const { data, status } = await axios.post(url, { username, domain }, { headers, timeout: 60000 });
  if (status !== 200) throw new Error(`upload-urls failed: ${status} ${JSON.stringify(data)}`);
  return data;
}

function uploadFile(filePath, relativePath, uploadUrl, authToken, authRestToken) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);
    const cleanUploadUrl = uploadUrl.replace(/\/$/, "");
    const uploadUrlWithFile = `${cleanUploadUrl}/${relativePath.replace(/\\/g, "/")}?override=true`;
    const requestHeaders = {
      "X-Auth": authToken,
      "X-Auth-Rest": authRestToken,
      "upload-length": String(stats.size),
      "upload-offset": "0",
    };

    axios
      .post(uploadUrlWithFile, "", { headers: requestHeaders, timeout: 60000, validateStatus: (s) => s === 201 })
      .then(() => {
        const upload = new tus.Upload(fileStream, {
          uploadUrl: uploadUrlWithFile,
          retryDelays: [1000, 2000, 4000, 8000, 16000, 20000],
          uploadDataDuringCreation: false,
          parallelUploads: 1,
          chunkSize: 10 * 1024 * 1024,
          headers: requestHeaders,
          removeFingerprintOnSuccess: true,
          uploadSize: stats.size,
          metadata: { filename: path.basename(relativePath) },
          onError: (error) => reject(error),
          onSuccess: () => resolve({ filename: relativePath }),
        });
        upload.start();
      })
      .catch(reject);
  });
}

async function fetchBuildSettings(archiveBasename) {
  const url = new URL(
    `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings/from-archive?archive_path=${encodeURIComponent(archiveBasename)}`,
    API_BASE,
  ).toString();
  try {
    const { data, status } = await axios.get(url, { headers, timeout: 60000 });
    if (status !== 200) throw new Error(`build settings failed: ${status} ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    console.log("[hostinger] Auto settings unavailable, using defaults for Next.js");
    return {
      node_version: nodeVersion,
      build_script: buildScript,
      package_manager: packageManager,
      app_type: "next",
      output_directory: ".next",
    };
  }
}

async function triggerBuild(archiveBasename, buildSettings) {
  const url = new URL(`api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`, API_BASE).toString();
  const payload = {
    ...buildSettings,
    node_version: nodeVersion || buildSettings?.node_version || 22,
    build_script: buildScript || buildSettings?.build_script || "build",
    package_manager: packageManager || buildSettings?.package_manager || "npm",
    app_type: buildSettings?.app_type || "next",
    source_type: "archive",
    source_options: { archive_path: archiveBasename },
  };
  const { data, status } = await axios.post(url, payload, {
    headers: { ...headers, "Content-Type": "application/json" },
    timeout: 120000,
  });
  if (status !== 200) throw new Error(`trigger build failed: ${status} ${JSON.stringify(data)}`);
  return data;
}

const archiveBasename = path.basename(archivePath);
console.log(`[hostinger] Upload credentials for ${domain}...`);
const creds = await fetchUploadCredentials();
console.log(`[hostinger] Uploading ${archiveBasename} (${Math.round(fs.statSync(archivePath).size / 1024)} KB)...`);
await uploadFile(archivePath, archiveBasename, creds.url, creds.auth_key, creds.rest_auth_key);
console.log("[hostinger] Resolving build settings...");
const settings = await fetchBuildSettings(archiveBasename);
console.log("[hostinger] Starting build...");
const build = await triggerBuild(archiveBasename, settings?.data ?? settings);
console.log(JSON.stringify(build));
