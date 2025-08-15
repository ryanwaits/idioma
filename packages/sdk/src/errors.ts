export class IdiomaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdiomaError';
  }
}

export class ConfigError extends IdiomaError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = 'ConfigError';
  }
}

export class TranslationError extends IdiomaError {
  constructor(message: string) {
    super(`Translation error: ${message}`);
    this.name = 'TranslationError';
  }
}

export class FileError extends IdiomaError {
  constructor(message: string) {
    super(`File error: ${message}`);
    this.name = 'FileError';
  }
}

export class ProviderError extends IdiomaError {
  constructor(provider: string, message: string) {
    super(`Provider error (${provider}): ${message}`);
    this.name = 'ProviderError';
  }
}
