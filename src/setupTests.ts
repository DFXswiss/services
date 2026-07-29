// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom doesn't provide TextEncoder/TextDecoder, which viem needs at import time.
import { TextDecoder, TextEncoder } from 'util';
global.TextEncoder ??= TextEncoder;
global.TextDecoder ??= TextDecoder as typeof global.TextDecoder;
