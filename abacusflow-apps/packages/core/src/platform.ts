type RedirectFn = (path: string) => void;

let redirectFn: RedirectFn = () => {};

export function setRedirect(fn: RedirectFn): void {
  redirectFn = fn;
}

export function redirect(path: string): void {
  redirectFn(path);
}
