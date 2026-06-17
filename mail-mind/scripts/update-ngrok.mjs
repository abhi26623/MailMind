#!/usr/bin/env node
// scripts/update-ngrok.mjs
// Run: node scripts/update-ngrok.mjs
// 
// This script:
// 1. Gets the current ngrok public URL from the ngrok local API
// 2. Updates NEXT_PUBLIC_APP_URL in your .env file
// 3. Updates the GCP Pub/Sub push subscription endpoint automatically

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ENV_FILE = resolve(process.cwd(), '.env');
const GCP_PROJECT = 'mail-mind-499304';
const PUBSUB_SUBSCRIPTION = 'corsair-webhooks-sub';  // your subscription name from GCP Console
const WEBHOOK_PATH = '/api/webhooks';

// ─── Step 1: Get ngrok URL ─────────────────────────────────────────────────

async function getNgrokUrl() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await res.json();
    const tunnel = data.tunnels?.find(t => t.proto === 'https');
    if (!tunnel) throw new Error('No HTTPS tunnel found');
    return tunnel.public_url;
  } catch {
    throw new Error('ngrok is not running. Start it first: ngrok http 3000');
  }
}

// ─── Step 2: Update .env file ──────────────────────────────────────────────

function updateEnv(ngrokUrl) {
  let env = readFileSync(ENV_FILE, 'utf-8');
  
  if (env.includes('NEXT_PUBLIC_APP_URL=')) {
    env = env.replace(/NEXT_PUBLIC_APP_URL=.*/g, `NEXT_PUBLIC_APP_URL="${ngrokUrl}"`);
  } else {
    env += `\nNEXT_PUBLIC_APP_URL="${ngrokUrl}"\n`;
  }

  writeFileSync(ENV_FILE, env);
  console.log('✅ .env updated:', ngrokUrl);
}

// ─── Step 3: Update GCP Pub/Sub subscription ──────────────────────────────

async function updatePubSubSubscription(ngrokUrl) {
  // Get an access token via gcloud
  // Requires: gcloud CLI installed and authenticated
  let accessToken;
  try {
    const { execSync } = await import('child_process');
    accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
  } catch {
    console.warn('⚠️  gcloud CLI not found or not authenticated.');
    console.warn('   Install it from https://cloud.google.com/sdk and run: gcloud auth login');
    console.warn('   Then manually update the push subscription endpoint in GCP Console to:');
    console.warn(`   ${ngrokUrl}${WEBHOOK_PATH}`);
    return;
  }

  const subscriptionName = `projects/${GCP_PROJECT}/subscriptions/${PUBSUB_SUBSCRIPTION}`;
  const newEndpoint = `${ngrokUrl}${WEBHOOK_PATH}`;

  const res = await fetch(
    `https://pubsub.googleapis.com/v1/${subscriptionName}:modifyPushConfig`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pushConfig: {
          pushEndpoint: newEndpoint,
        },
      }),
    }
  );

  if (res.ok) {
    console.log('✅ GCP Pub/Sub subscription updated:', newEndpoint);
  } else {
    const err = await res.text();
    console.error('❌ Failed to update Pub/Sub subscription:', err);
    console.warn('   Manually update it in GCP Console to:', newEndpoint);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔄 Updating ngrok URL everywhere...\n');
  
  const ngrokUrl = await getNgrokUrl();
  console.log('📡 Detected ngrok URL:', ngrokUrl);

  updateEnv(ngrokUrl);
  await updatePubSubSubscription(ngrokUrl);

  console.log('\n✅ Done! Restart your Next.js dev server for the new URL to take effect.\n');
}

main().catch(e => {
  console.error('\n❌ Error:', e.message, '\n');
  process.exit(1);
});
