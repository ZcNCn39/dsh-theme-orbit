/**
 * Host half of dsh-theme-orbit — deliberately empty.
 *
 * Everything visual lives in `./client` (token layer + one scoped stylesheet).
 * A theme must not register routes, tools, commands or prompt content, so the
 * Host side only satisfies the loader's "import a plugin" contract.
 */
export const name = 'dsh-theme-orbit'

export const inject = []

export function apply() {}
