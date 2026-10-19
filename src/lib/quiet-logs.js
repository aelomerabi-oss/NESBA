/*
 * The app logs chat messages, emails and other personal data with
 * console.log while debugging. In a production build anyone with the
 * browser console open would see them, so silence log/info/debug there.
 * console.warn and console.error stay on for diagnosing real problems.
 */
if (!__DEV__) {
  const noop = () => {};

  console.log = noop;
  console.info = noop;
  console.debug = noop;
}
