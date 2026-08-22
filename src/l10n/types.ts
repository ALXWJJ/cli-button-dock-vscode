export type ConfiguratorStrings = {
  htmlLang: string
  title: string
  hint: string
  save: string
  saveAndReload: string
  reset: string
  advanced: string
  colEnabled: string
  colSlot: string
  colPreset: string
  colLabel: string
  colIcon: string
  colCommand: string
  slotLabel: string
  presetCustom: string
  commandPlaceholder: string
  labelPlaceholder: string
  iconSearchPlaceholder: string
  iconSearchAria: string
  customSvgTitle: string
  customUrlTitle: string
  customSvgTrigger: string
  customUrlTrigger: string
  customIconLabel: string
  customIconClose: string
  customIconCancel: string
  customIconApply: string
  customSvgPlaceholder: string
  customUrlPlaceholder: string
  customSvgPreviewEmpty: string
  customUrlPreviewEmpty: string
  customPreviewFailed: string
  customSvgPreviewError: string
  customUrlPreviewError: string
  customImageLoadError: string
  customSvgApplyError: string
  customUrlApplyError: string
  pickIconPrefix: string
  customIconName: string
  advancedHint: string
  savedMessage: string
  resetMessage: string
}

export type MessageStrings = {
  manifestChanged: string
  manifestMetadataChanged: string
  configureCommandFirst: string
}

export type LocaleBundle = {
  configurator: ConfiguratorStrings
  emojiNames: Record<string, string>
  messages: MessageStrings
}

export type SupportedLocale =
  | "en"
  | "zh-cn"
  | "zh-tw"
  | "ja"
  | "ko"
  | "de"
  | "fr"
  | "es"
  | "pt-br"
  | "ru"
  | "it"

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  "en",
  "zh-cn",
  "zh-tw",
  "ja",
  "ko",
  "de",
  "fr",
  "es",
  "pt-br",
  "ru",
  "it",
]
