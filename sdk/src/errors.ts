export class OpenLocaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenLocaleError";
  }
}

export class ConfigError extends OpenLocaleError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigError";
  }
}

export class TranslationError extends OpenLocaleError {
  constructor(message: string) {
    super(`Translation error: ${message}`);
    this.name = "TranslationError";
  }
}

export class FileError extends OpenLocaleError {
  constructor(message: string) {
    super(`File error: ${message}`);
    this.name = "FileError";
  }
}

export class ProviderError extends OpenLocaleError {
  constructor(provider: string, message: string) {
    super(`Provider error (${provider}): ${message}`);
    this.name = "ProviderError";
  }
}