# Agent Rules Standard

## Build Verification
- When a task is completed or changes of a certain unit are finished, please check if the build passes by running `yarn build`

## Debugging Guidelines
- This is Chrome Extension and typescript, to output debug message, DO NOT `console.log`. Use alert, toast or display on UI (temporaly).
- Debug Alert message should start from `DEBUG:` to ease to find DEBUG alert

## Code Style Standards
- Follow the app style standard as much as possible, refer `src/app/base.scss` and existing elements
- Use the custom scrollbar class `.custom-scrollbar` for scrollable areas
- Follow the existing component patterns and structure

## Error Handling
- Don't Fallback - When data doesn't meet expectations or differs from what the user intends, treat it as an error rather than providing a generic fallback

## Code Review Process
- 请审查是否按照用户的指示或设计进行了一致性实现，并在确认代码审查中绝对不会发生构建错误后再执行`yarn build`。

## Development Environment
- Use i18n translator and update all 4 localization file without missing.

## File Structure
- Chrome Extension structure with `manifest.config.ts`
- React components in `src/app/components/`
- Services in `src/services/`
- Utilities in `src/utils/`
- Internationalization in `src/app/i18n/locales/`
- Styles in `src/app/base.scss` using Tailwind CSS

## Testing
- Ask user to check what, after success run of yarn build.