declare module "morgan" {
  import type { RequestHandler } from "express";

  type FormatFn = (tokens: Record<string, (req: unknown, res: unknown) => string | number>, req: unknown, res: unknown) => string;

  function morgan(format: string | FormatFn, options?: Record<string, unknown>): RequestHandler;
  function morgan(): RequestHandler;

  namespace morgan {
    function combined(tokens: Record<string, (req: unknown, res: unknown) => string | number>, req: unknown, res: unknown): string;
    function dev(tokens: Record<string, (req: unknown, res: unknown) => string | number>, req: unknown, res: unknown): string;
  }

  export = morgan;
}
