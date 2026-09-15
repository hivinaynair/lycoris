/**
 * Identity, not assignability.
 *
 * Every other assertion in this package is a plain assignment, which only proves
 * the source is *at least* the target. That is the right check for option bags,
 * which are supposed to accept more over time. It is the wrong check for the
 * surface a consumer switches on, because assignability is one-directional and
 * `any` satisfies all of it: if a public type ever collapsed to `any`, every
 * assignment here would keep compiling and nothing would say so.
 *
 * `Equal` compares two types by whether two generic signatures written against
 * them are mutually assignable, one of the few places the compiler checks type
 * identity rather than assignability. `Equal<any, string>` is `false`.
 *
 * Use it sparingly. Each one makes an intentional widening a two-file edit, so
 * spend them only where a silent widening would break a consumer.
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Fails to compile unless `T` is exactly `true`. */
export type Expect<T extends true> = T;
