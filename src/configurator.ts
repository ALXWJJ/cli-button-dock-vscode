import * as crypto from "node:crypto"
import * as vscode from "vscode"
import { normalizeButtons } from "./config"
import { SLOT_EMOJIS } from "./constants"
import { getBrandAssetPath, getExtensionAssetUriForWebview } from "./icons"
import { getConfiguratorStrings, getEmojiDisplayName, getLanguage } from "./l10n"
import { AGENT_PRESETS, BRAND_ICON_OPTIONS, DEFAULT_BUTTONS, EMOJI_ICON_OPTIONS } from "./presets"
import type { ButtonConfig, ConfiguratorHandlers } from "./types"

export function openConfigurator(
  context: vscode.ExtensionContext,
  initialButtons: ButtonConfig[],
  handlers: ConfiguratorHandlers,
) {
  const language = getLanguage()
  const strings = getConfiguratorStrings(language)
  const panel = vscode.window.createWebviewPanel(
    "cliButtonDock.configurator",
    strings.title,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  )

  const renderHtml = (buttons: ButtonConfig[]) => getConfiguratorHtml(
    panel.webview,
    context.extensionUri,
    buttons,
    language,
    vscode.window.activeColorTheme.kind,
  )

  panel.webview.html = renderHtml(initialButtons)

  const themeListener = vscode.window.onDidChangeActiveColorTheme((theme) => {
    panel.webview.postMessage({ type: "theme", themeKind: theme.kind })
  })
  panel.onDidDispose(() => themeListener.dispose())

  panel.webview.onDidReceiveMessage(async (message: unknown) => {
    if (!message || typeof message !== "object") {
      return
    }
    const data = message as { type?: string; buttons?: unknown }
    if (data.type === "update") {
      const nextButtons = normalizeButtons(data.buttons)
      await handlers.apply(nextButtons)
    } else if (data.type === "reset") {
      const nextButtons = DEFAULT_BUTTONS.map((button) => ({ ...button }))
      await handlers.apply(nextButtons)
      panel.webview.postMessage({ type: "config", buttons: nextButtons })
    } else if (data.type === "openAdvanced") {
      await vscode.commands.executeCommand("workbench.action.openSettingsJson")
    }
  }, undefined, context.subscriptions)
}

function getConfiguratorHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  buttons: ButtonConfig[],
  language: string,
  themeKind: vscode.ColorThemeKind,
) {
  const strings = getConfiguratorStrings(language)
  const nonce = crypto.randomBytes(16).toString("hex")
  const state = JSON.stringify(buttons).replaceAll("<", "\\u003c")
  const presets = JSON.stringify(AGENT_PRESETS).replaceAll("<", "\\u003c")
  const emojiIcons = JSON.stringify(EMOJI_ICON_OPTIONS.map((emoji) => ({
    ...emoji,
    name: getEmojiDisplayName(emoji.id, language),
  }))).replaceAll("<", "\\u003c")
  const brandIcons = JSON.stringify(BRAND_ICON_OPTIONS.map((brand) => {
    const preset = AGENT_PRESETS.find((item) => item.icon === brand.id)
    const searchParts = [
      brand.id,
      brand.id.replace(/^brand:/, ""),
      brand.name,
      preset?.id,
      preset?.label,
      preset?.command,
    ].filter((part) => typeof part === "string" && part.trim())
    return {
      id: brand.id,
      name: brand.name,
      searchText: searchParts.join(" ").toLowerCase(),
      light: webview.asWebviewUri(getExtensionAssetUriForWebview(extensionUri, getBrandAssetPath(brand, "light"))).toString(),
      dark: webview.asWebviewUri(getExtensionAssetUriForWebview(extensionUri, getBrandAssetPath(brand, "dark"))).toString(),
    }
  })).replaceAll("<", "\\u003c")
  const uiStrings = JSON.stringify(strings).replaceAll("<", "\\u003c")
  const slotEmojis = JSON.stringify(SLOT_EMOJIS).replaceAll("<", "\\u003c")

  return `<!DOCTYPE html>
<html lang="${strings.htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} http: https: data:; style-src 'unsafe-inline' ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${strings.title}</title>
  <style>
    :root { color-scheme: light dark; }
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); padding: 24px; max-width: 1180px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; position: sticky; top: 0; padding: 8px 0; background: var(--vscode-editor-background); z-index: 2; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 7px 14px; cursor: pointer; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    #message { min-height: 20px; margin-left: 8px; flex: 1 1 180px; font-size: 12px; line-height: 1.4; color: var(--vscode-descriptionForeground); }
    #message.is-error { color: var(--vscode-errorForeground); }
    .toolbar-hint { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.4; margin-left: 4px; }
    .toolbar-hint[hidden] { display: none; }
    .table-head, .button-row { display: grid; grid-template-columns: 34px 52px minmax(150px, 0.9fr) minmax(150px, 0.9fr) 150px minmax(240px, 1.4fr); gap: 10px; align-items: center; }
    .table-head { color: var(--vscode-descriptionForeground); font-size: 12px; padding: 0 12px 6px; }
    .button-row { border: 1px solid var(--vscode-panel-border); padding: 9px 12px; margin: 6px 0; border-radius: 4px; }
    .button-row:focus-within { border-color: var(--vscode-focusBorder); }
    .slot { display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; }
    .enabled { width: 16px; height: 16px; justify-self: center; }
    input, select, textarea { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 6px 8px; font: inherit; }
    textarea { resize: vertical; min-height: 100px; line-height: 1.4; }
    .icon-picker { position: relative; display: flex; align-items: center; gap: 5px; min-width: 0; }
    .icon-preview { display: inline-flex; align-items: center; justify-content: center; width: 32px; min-width: 32px; height: 32px; padding: 0; color: var(--vscode-icon-foreground, var(--vscode-foreground)); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); font-size: 18px; }
    .icon-preview:hover { background: var(--vscode-list-hoverBackground); }
    .icon-preview img, .icon-option img, .custom-icon-live-preview img { display: block; width: 20px; height: 20px; object-fit: contain; }
    .icon-custom-trigger { display: inline-flex; align-items: center; justify-content: center; width: 32px; min-width: 32px; height: 32px; padding: 0; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); font-size: 0; line-height: 1; vertical-align: middle; }
    .icon-custom-trigger:hover { background: var(--vscode-list-hoverBackground); }
    .lucide-icon { display: block; width: 17px; height: 17px; }
    .icon-emoji { display: inline-flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }
    .icon-menu { position: absolute; top: calc(100% + 5px); right: 0; z-index: 10; width: min(420px, 70vw); padding: 8px; background: var(--vscode-quickInput-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-focusBorder); box-shadow: 0 8px 24px var(--vscode-widget-shadow); }
    .icon-menu[hidden] { display: none; }
    .icon-search { margin-bottom: 8px; }
    .icon-grid-scroll { max-height: 300px; overflow: auto; }
    .icon-grid { display: grid; grid-template-columns: repeat(8, minmax(32px, 1fr)); gap: 4px; }
    .icon-option { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; color: var(--vscode-foreground); background: transparent; border: 0; }
    .icon-option.is-filtered { display: none !important; }
    .icon-option:hover, .icon-option.selected { color: var(--vscode-list-activeSelectionForeground); background: var(--vscode-list-activeSelectionBackground); }
    .custom-icon-editor { position: absolute; top: calc(100% + 5px); right: 0; z-index: 12; width: min(440px, 78vw); padding: 12px; background: var(--vscode-quickInput-background, var(--vscode-editor-background)); border: 1px solid var(--vscode-focusBorder); box-shadow: 0 8px 24px var(--vscode-widget-shadow); }
    .custom-icon-editor[hidden] { display: none; }
    .custom-icon-editor-header, .custom-icon-editor-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .custom-icon-editor-title { font-weight: 600; }
    .custom-icon-close { width: 26px; height: 26px; padding: 0; font-size: 18px; line-height: 1; }
    .custom-icon-live-preview { display: flex; align-items: center; justify-content: center; min-height: 68px; margin-top: 8px; color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background); border: 1px dashed var(--vscode-panel-border); }
    .custom-icon-live-preview img { width: 44px; height: 44px; }
    .custom-icon-error { min-height: 18px; margin-top: 6px; color: var(--vscode-errorForeground); font-size: 12px; }
    .custom-icon-editor-actions { justify-content: flex-end; margin-top: 8px; }
    @media (max-width: 760px) {
      .table-head { display: none; }
      .button-row { grid-template-columns: 30px 42px 1fr 1fr; }
      .preset { grid-column: 3 / -1; }
      .label { grid-column: 3; }
      .icon-picker { grid-column: 3 / -1; }
      .command { grid-column: 3 / -1; }
    }
  </style>
</head>
<body>
  <h1>${strings.title}</h1>
  <div class="toolbar">
    <button id="reset">${strings.reset}</button>
    <button id="advanced">${strings.advanced}</button>
    <span id="customIconHint" class="toolbar-hint" hidden>${strings.customIconHint}</span>
    <span id="message"></span>
  </div>
  <div class="table-head"><span>${strings.colEnabled}</span><span>${strings.colSlot}</span><span>${strings.colPreset}</span><span>${strings.colLabel}</span><span>${strings.colIcon}</span><span>${strings.colCommand}</span></div>
  <main id="app"></main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let state = ${state};
    const presets = ${presets};
    const emojiIcons = ${emojiIcons};
    const brandIcons = ${brandIcons};
    const strings = ${uiStrings};
    const slotEmojis = ${slotEmojis};
    let themeKind = ${themeKind};
    const lucideIcons = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5h6"/><path d="M19 2v6"/><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
      url: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>'
    };
    const app = document.getElementById('app');
    const message = document.getElementById('message');
    const customIconHint = document.getElementById('customIconHint');

    function isCustomImage(value) {
      const raw = String(value || '').trim();
      const lower = raw.toLowerCase();
      return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:image/') || lower.startsWith('<svg') || (lower.startsWith('<?xml') && lower.includes('<svg'));
    }

    function updateCustomIconHint() {
      if (!customIconHint) return;
      customIconHint.hidden = !state.some((button) => isCustomImage(button.icon));
    }

    function isDarkTheme() {
      return themeKind === 2 || themeKind === 3;
    }

    function textInput(className, value, placeholder) {
      const input = document.createElement('input');
      input.className = className;
      input.value = value || '';
      input.placeholder = placeholder || '';
      return input;
    }

    function selectInput(className, values, value) {
      const select = document.createElement('select');
      select.className = className;
      values.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        select.append(option);
      });
      select.value = value;
      return select;
    }

    function createLucideIcon(name) {
      const template = document.createElement('template');
      template.innerHTML = lucideIcons[name];
      const icon = template.content.firstElementChild;
      icon.classList.add('lucide-icon');
      icon.setAttribute('aria-hidden', 'true');
      return icon;
    }

    function iconName(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^\\$\\(([^)]+)\\)$/);
      return (match ? match[1] : raw) || 'terminal';
    }

    function customImageSource(value) {
      const raw = String(value || '').trim();
      const lower = raw.toLowerCase();
      if (lower.startsWith('<svg') || (lower.startsWith('<?xml') && lower.includes('<svg'))) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(raw);
      }
      return raw;
    }

    function createCustomImage(value) {
      const image = document.createElement('img');
      image.src = customImageSource(value);
      image.alt = '';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.setAttribute('aria-hidden', 'true');
      return image;
    }

    function isInlineSvg(value) {
      const raw = String(value || '').trim().toLowerCase();
      return raw.startsWith('<svg') || (raw.startsWith('<?xml') && raw.includes('<svg'));
    }

    function createCustomIconEditor(onApply) {
      const editor = document.createElement('div');
      editor.className = 'custom-icon-editor';
      editor.hidden = true;
      const header = document.createElement('div');
      header.className = 'custom-icon-editor-header';
      const title = document.createElement('span');
      title.className = 'custom-icon-editor-title';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'custom-icon-close';
      close.textContent = '×';
      close.title = strings.customIconClose;
      header.append(title, close);

      const field = document.createElement('textarea');
      field.className = 'custom-icon-value';
      field.spellcheck = false;
      field.setAttribute('aria-label', strings.customIconLabel);
      const preview = document.createElement('div');
      preview.className = 'custom-icon-live-preview';
      const error = document.createElement('div');
      error.className = 'custom-icon-error';
      const actions = document.createElement('div');
      actions.className = 'custom-icon-editor-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = strings.customIconCancel;
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.textContent = strings.customIconApply;
      actions.append(cancel, apply);
      editor.append(header, field, preview, error, actions);

      let mode = 'svg';

      function updateMode(nextMode) {
        mode = nextMode === 'url' ? 'url' : 'svg';
        title.textContent = mode === 'svg' ? strings.customSvgTitle : strings.customUrlTitle;
        field.placeholder = mode === 'svg' ? strings.customSvgPlaceholder : strings.customUrlPlaceholder;
        renderPreview();
      }

      function renderPreview() {
        const raw = field.value.trim();
        preview.replaceChildren();
        error.textContent = '';
        if (!raw) {
          preview.textContent = mode === 'svg' ? strings.customSvgPreviewEmpty : strings.customUrlPreviewEmpty;
          return;
        }

        const valid = isCustomImage(raw) && (mode === 'svg' ? isInlineSvg(raw) : !isInlineSvg(raw));
        if (!valid) {
          preview.textContent = strings.customPreviewFailed;
          error.textContent = mode === 'svg' ? strings.customSvgPreviewError : strings.customUrlPreviewError;
          return;
        }

        const image = createCustomImage(raw);
        image.addEventListener('error', () => {
          preview.replaceChildren();
          preview.textContent = strings.customPreviewFailed;
          error.textContent = strings.customImageLoadError;
        });
        preview.append(image);
      }

      function hide() {
        editor.hidden = true;
      }

      close.addEventListener('click', (event) => { event.stopPropagation(); hide(); });
      cancel.addEventListener('click', (event) => { event.stopPropagation(); hide(); });
      field.addEventListener('input', renderPreview);
      apply.addEventListener('click', (event) => {
        event.stopPropagation();
        const raw = field.value.trim();
        const valid = isCustomImage(raw) && (mode === 'svg' ? isInlineSvg(raw) : !isInlineSvg(raw));
        if (!valid) {
          renderPreview();
          error.textContent = mode === 'svg' ? strings.customSvgApplyError : strings.customUrlApplyError;
          return;
        }
        onApply(raw);
        hide();
      });
      editor.addEventListener('click', (event) => event.stopPropagation());

      return {
        element: editor,
        open: (next, nextMode) => {
          const raw = String(next || '').trim();
          updateMode(nextMode);
          field.value = mode === 'svg'
            ? (isInlineSvg(raw) ? raw : '')
            : (isCustomImage(raw) && !isInlineSvg(raw) ? raw : '');
          renderPreview();
          editor.hidden = false;
          field.focus();
        },
      };
    }

    function normalizeSearchQuery(value) {
      return String(value || '').trim().toLowerCase();
    }

    function matchesIconSearch(searchText, query) {
      if (!query) return true;
      const haystack = String(searchText || '').toLowerCase();
      return query.split(/\s+/).every((token) => haystack.includes(token));
    }

    function createIconPicker(value, onChange) {
      const picker = document.createElement('div');
      picker.className = 'icon-picker';
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'icon-preview';
      const menu = document.createElement('div');
      menu.className = 'icon-menu';
      menu.hidden = true;
      const search = textInput('icon-search', '', strings.iconSearchPlaceholder);
      search.setAttribute('aria-label', strings.iconSearchAria);
      const gridScroll = document.createElement('div');
      gridScroll.className = 'icon-grid-scroll';
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      const optionElements = [];
      let currentValue = value || '';

      function createBrandImage(brand) {
        const image = document.createElement('img');
        image.src = isDarkTheme() ? brand.dark : brand.light;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        return image;
      }

      function createEmojiGlyph(emoji) {
        const glyph = document.createElement('span');
        glyph.className = 'icon-emoji';
        glyph.textContent = emoji.glyph;
        glyph.setAttribute('aria-hidden', 'true');
        return glyph;
      }

      function updatePreview(next) {
        currentValue = next || '';
        const custom = isCustomImage(next);
        const name = custom ? strings.customIconName : iconName(next);
        const brand = brandIcons.find((item) => item.id === name);
        const emoji = emojiIcons.find((item) => item.id === name);
        preview.replaceChildren();
        if (custom) {
          preview.append(createCustomImage(next));
        } else if (brand) {
          preview.append(createBrandImage(brand));
        } else if (emoji) {
          preview.append(createEmojiGlyph(emoji));
        } else {
          const glyph = document.createElement('span');
          glyph.className = 'icon-emoji';
          glyph.textContent = '👻';
          preview.append(glyph);
        }
        const displayName = custom ? strings.customIconName : (brand ? brand.name : (emoji ? emoji.name : name));
        preview.title = strings.pickIconPrefix + displayName;
        preview.setAttribute('aria-label', strings.pickIconPrefix + displayName);
        optionElements.forEach((item) => item.element.classList.toggle('selected', item.name === name));
      }

      function refreshBrandImages() {
        optionElements.forEach((item) => {
          if (!item.brand) return;
          const image = item.element.querySelector('img');
          if (image) image.src = isDarkTheme() ? item.brand.dark : item.brand.light;
        });
        const custom = isCustomImage(currentValue);
        const name = custom ? strings.customIconName : iconName(currentValue);
        const brand = brandIcons.find((item) => item.id === name);
        if (brand && !custom) {
          preview.replaceChildren(createBrandImage(brand));
        }
      }

      const customEditor = createCustomIconEditor((next) => {
        currentValue = next;
        updatePreview(next);
        onChange(next);
      });

      function createCustomTrigger(iconName, title, mode) {
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'icon-custom-trigger';
        trigger.append(createLucideIcon(iconName));
        trigger.title = title;
        trigger.setAttribute('aria-label', title);
        trigger.addEventListener('click', (event) => {
          event.stopPropagation();
          menu.hidden = true;
          customEditor.open(currentValue, mode);
        });
        return trigger;
      }

      const customSvgTrigger = createCustomTrigger('svg', strings.customSvgTrigger, 'svg');
      const customUrlTrigger = createCustomTrigger('url', strings.customUrlTrigger, 'url');

      function filterOptions() {
        const query = normalizeSearchQuery(search.value);
        optionElements.forEach((item) => {
          item.element.classList.toggle('is-filtered', !!query && !matchesIconSearch(item.search, query));
        });
      }

      function keepMenuOpen(event) {
        event.stopPropagation();
      }

      brandIcons.forEach((brand) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'icon-option';
        option.title = brand.name + ' (' + brand.id + ')';
        option.setAttribute('aria-label', brand.name);
        option.append(createBrandImage(brand));
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          updatePreview(brand.id);
          onChange(brand.id);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({
          element: option,
          name: brand.id,
          brand,
          search: brand.searchText || (brand.id + ' ' + brand.name).toLowerCase(),
        });
        grid.append(option);
      });

      emojiIcons.forEach((emoji) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'icon-option';
        option.title = emoji.name + ' (' + emoji.id + ')';
        option.setAttribute('aria-label', emoji.name);
        option.append(createEmojiGlyph(emoji));
        option.addEventListener('click', (event) => {
          event.stopPropagation();
          updatePreview(emoji.id);
          onChange(emoji.id);
          menu.hidden = true;
          search.value = '';
          filterOptions();
        });
        optionElements.push({
          element: option,
          name: emoji.id,
          search: (emoji.id + ' ' + emoji.name + ' ' + emoji.glyph).toLowerCase(),
        });
        grid.append(option);
      });

      preview.addEventListener('click', (event) => {
        event.stopPropagation();
        customEditor.element.hidden = true;
        const shouldOpen = menu.hidden;
        document.querySelectorAll('.icon-menu').forEach((item) => { item.hidden = true; });
        menu.hidden = !shouldOpen;
        if (shouldOpen) {
          search.value = '';
          filterOptions();
          requestAnimationFrame(() => search.focus());
        }
      });
      search.addEventListener('input', filterOptions);
      search.addEventListener('keydown', keepMenuOpen);
      search.addEventListener('mousedown', keepMenuOpen);
      search.addEventListener('click', keepMenuOpen);
      menu.addEventListener('mousedown', keepMenuOpen);
      menu.addEventListener('click', keepMenuOpen);
      gridScroll.append(grid);
      menu.append(search, gridScroll);
      picker.append(preview, customSvgTrigger, customUrlTrigger, menu, customEditor.element);
      picker.refreshBrandImages = refreshBrandImages;
      updatePreview(currentValue);
      return {
        element: picker,
        setValue: (next) => {
          updatePreview(next || '');
        },
        refreshBrandImages,
      };
    }

    const iconPickers = [];

    function getPresetId(button) {
      return presets.some((preset) => preset.id === button.preset) ? button.preset : 'custom';
    }

    function render() {
      app.replaceChildren();
      iconPickers.length = 0;
      state.forEach((button) => {
        const row = document.createElement('div');
        row.className = 'button-row';
        row.dataset.id = button.id;
        const enabled = document.createElement('input');
        enabled.type = 'checkbox';
        enabled.className = 'enabled';
        enabled.checked = !!button.enabled;
        const slot = document.createElement('span');
        slot.className = 'slot';
        slot.textContent = slotEmojis[button.id] || button.id;
        const presetOptions = [{ value: 'custom', label: strings.presetCustom }].concat(presets.map((preset) => ({ value: preset.id, label: preset.name })));
        const preset = selectInput('preset', presetOptions, getPresetId(button));
        const label = textInput('label', button.label, strings.labelPlaceholder);
        const iconPicker = createIconPicker(button.icon, (value) => {
          button.icon = value;
          saveNow();
        });
        iconPickers.push(iconPicker);
        const command = textInput('command', button.command, strings.commandPlaceholder);
        command.spellcheck = false;
        row.append(enabled, slot, preset, label, iconPicker.element, command);

        preset.addEventListener('change', () => {
          const selected = presets.find((item) => item.id === preset.value);
          button.preset = preset.value || 'custom';
          if (!selected) {
            saveNow();
            return;
          }
          button.label = selected.label;
          button.icon = selected.icon;
          button.command = selected.command;
          button.cwd = selected.cwd;
          label.value = selected.label;
          iconPicker.setValue(selected.icon);
          command.value = selected.command;
          saveNow();
        });
        enabled.addEventListener('change', () => {
          button.enabled = enabled.checked;
          saveNow();
        });
        label.addEventListener('input', () => {
          button.label = label.value;
          scheduleSave();
        });
        command.addEventListener('input', () => {
          button.command = command.value;
          scheduleSave();
        });
        app.append(row);
      });
      updateCustomIconHint();
    }

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.icon-menu, .custom-icon-editor, .icon-preview, .icon-custom-trigger')) {
        return;
      }
      document.querySelectorAll('.icon-menu').forEach((item) => { item.hidden = true; });
      document.querySelectorAll('.custom-icon-editor').forEach((item) => { item.hidden = true; });
    });

    let saveTimer = null;

    function postUpdate() {
      const next = state.map((button) => ({ ...button }));
      vscode.postMessage({ type: 'update', buttons: next });
    }

    function saveNow() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      updateCustomIconHint();
      postUpdate();
    }

    function scheduleSave() {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(() => {
        saveTimer = null;
        updateCustomIconHint();
        postUpdate();
      }, 300);
    }

    document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type: 'reset' }));
    document.getElementById('advanced').addEventListener('click', () => vscode.postMessage({ type: 'openAdvanced' }));
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data.type === 'theme') {
        themeKind = data.themeKind;
        iconPickers.forEach((picker) => picker.refreshBrandImages());
        return;
      }
      if (data.type === 'config') {
        state = data.buttons;
        render();
        message.textContent = strings.resetMessage;
        message.classList.remove('is-error');
      } else if (data.type === 'error') {
        message.textContent = data.message || strings.customIconApplyError;
        message.classList.add('is-error');
      }
    });
    render();
  </script>
</body>
</html>`
}
