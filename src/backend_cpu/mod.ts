import { dlopen, FetchOptions } from "../../deps.ts";
import { CPUBackend } from "./backend.ts";
import { NoBackendError } from "../core/api/error.ts";
import { BackendLoader, Engine } from "../core/engine.ts";
import { Backend, BackendType, NetworkConfig } from "../core/types.ts";

const options: FetchOptions = {
  name: "netsaur",
  url: new URL(import.meta.url).protocol !== "file:"
    ? new URL(
      "https://github.com/denosaurs/netsaur/releases/download/0.2.5/",
      import.meta.url,
    )
    : "./target/release/",
  cache: "reloadAll",
};

const symbols = {
  ffi_backend_create: {
    parameters: ["buffer", "usize", "buffer"],
    result: "u32",
  } as const,
  ffi_backend_train: {
    parameters: ["buffer", "usize", "buffer", "usize"],
    result: "void",
  } as const,
  ffi_backend_predict: {
    parameters: ["buffer", "buffer", "usize", "buffer"],
    result: "buffer",
  } as const,
  ffi_backend_save: {
    parameters: [],
    result: "buffer",
  } as const,
};

export type Library = Deno.DynamicLibrary<typeof symbols>;

export class CPUInstance {
  static library?: Library;
  static initialized = false;

  static async init(silent = false) {
    if (CPUInstance.initialized) return true;

    CPUInstance.library = await dlopen(options, symbols);
    CPUInstance.initialized = true;
    if (!silent) console.log("CPU Backend Initialised");
    return true;
  }
}

export class CPUBackendLoader implements BackendLoader {
  async setup(silent = false) {
    Engine.type = BackendType.CPU;
    return await CPUInstance.init(silent);
  }

  loadBackend(config: NetworkConfig): Backend {
    if (!CPUInstance.initialized) {
      throw new NoBackendError(BackendType.CPU);
    }
    return new CPUBackend(config, CPUInstance.library!);
  }

  loadModel(path: string): Backend;
  loadModel(path: Uint8Array): Backend;
  loadModel(path: string | Uint8Array): Backend {
    return CPUBackend.loadModel(path);
  }
}

/**
 * CPU Backend written in Rust.
 */
export const CPU = new CPUBackendLoader();
