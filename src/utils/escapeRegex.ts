// Escapes regex metacharacters so user-supplied search strings are matched
// literally. Without this, `$regex: rawInput` lets a client submit a pattern
// with catastrophic backtracking (e.g. "(a+)+$") and tie up the event loop —
// a regex-based DoS — since Mongo runs the client-controlled pattern against
// every stored value.
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
