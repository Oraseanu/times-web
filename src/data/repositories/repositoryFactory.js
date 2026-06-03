import { APP_MODES, appConfig } from "../../config/environment.js";
import { HttpStateRepository } from "./HttpStateRepository.js";
import { LocalStateRepository } from "./LocalStateRepository.js";
import { MemoryStateRepository } from "./MemoryStateRepository.js";

export function createStateRepository(config = appConfig) {
  switch (config.appMode) {
    case APP_MODES.DEMO:
      return new MemoryStateRepository();
    case APP_MODES.LOCAL_PROD:
      return config.localApiBaseUrl
        ? new HttpStateRepository({ baseUrl: config.localApiBaseUrl })
        : new LocalStateRepository();
    case APP_MODES.CLOUD_PROD:
      return new HttpStateRepository({ baseUrl: config.cloudApiBaseUrl });
    default:
      console.warn(`APP_MODE necunoscut: ${config.appMode}. Se foloseste demo.`);
      return new MemoryStateRepository();
  }
}
