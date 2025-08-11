#!/usr/bin/env bun

/**
 * Example script to test the Idioma API
 * Run with: bun run src/api/examples/test-api.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'develop_3ZmaxU8Z345ZFzKfw3cfmopQ';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

async function testEndpoint(name: string, endpoint: string, options: RequestInit): Promise<void> {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
  console.log(`${colors.dim}${options.method} ${endpoint}${colors.reset}`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`${colors.red}✗ Failed (${response.status})${colors.reset}`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.yellow}Idioma API Test Suite${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.slice(0, 10)}...`);

  // Test 1: Health check (no auth required)
  await testEndpoint('Health Check', '/api/health', {
    method: 'GET',
  });

  // Test 2: Simple translation
  await testEndpoint('Simple Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Hello, how are you today?',
      sourceLocale: 'en',
      targetLocale: 'es',
      format: 'string',
    }),
  });

  // Test 3: Markdown translation
  await testEndpoint('Markdown Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: `# Welcome to Idioma

This is a **test document** with:
- Bullet points
- *Italic text*
- [Links](https://example.com)

> And a blockquote for good measure!`,
      sourceLocale: 'en',
      targetLocale: 'fr',
      format: 'md',
    }),
  });

  // Test 4: Batch translation
  await testEndpoint('Batch Translation', '/api/translate/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Welcome to our documentation!',
      sourceLocale: 'en',
      targetLocales: ['es', 'fr', 'de'],
      format: 'string',
    }),
  });

  // Test 5: MDX translation
  await testEndpoint('MDX Translation', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: `---
title: Getting Started
description: Learn the basics
---

import { Button } from '@/components/Button'

# Getting Started

Click the button below to begin:

<Button label="Start Now" />`,
      sourceLocale: 'en',
      targetLocale: 'ja',
      format: 'mdx',
    }),
  });

  // Test 6: Invalid API key
  await testEndpoint('Invalid API Key', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'invalid_key',
    },
    body: JSON.stringify({
      content: 'Test',
      targetLocale: 'es',
    }),
  });

  // Test 7: Missing required field
  await testEndpoint('Validation Error', '/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      content: 'Test',
      // Missing targetLocale
    }),
  });

  console.log(`\n${colors.green}Test suite completed!${colors.reset}`);
}

// Run the tests
main().catch(console.error);
