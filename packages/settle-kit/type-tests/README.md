# @settle-kit/type-tests

Pins the SDK's **public type surface** as a consumer sees it.

These files are never run. They are checked by `bun run check-types`, which builds the
four packages first, so every import here resolves to the shipped `dist/*.d.ts` rather
than to source. A `@ts-expect-error` that stops erroring fails the build, so the
negative assertions cannot silently rot.

Add a case here whenever a public type changes shape.
