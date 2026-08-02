// Re-export the native module. On web, it will be resolved to OmrOpencvModule.web.ts
// and on native platforms to OmrOpencvModule.ts
export { default } from './src/OmrOpencvModule';
export * from './src/OmrOpencv.types';
