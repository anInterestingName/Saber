import type {
  Reporter,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { AUTH_CSRF, AUTH_CSRF_RENEWED, BFF_CSRF, MOCK_PASSWORD } from '../support/constants';

const secrets = [
  process.env.E2E_USERNAME,
  process.env.E2E_PASSWORD,
  AUTH_CSRF,
  AUTH_CSRF_RENEWED,
  BFF_CSRF,
  MOCK_PASSWORD,
].filter((value): value is string => !!value);

const redact = (text: string) => {
  let result = text;
  for (const secret of secrets) result = result.replaceAll(secret, '[已隐藏]');
  return result
    .replace(/^Fill ".*"/s, '填写表单（值已隐藏）')
    .replace(
      /([?&](?:code|state|token|password|secret|code_verifier|code_challenge)=)[^&\s"'<>]+/gi,
      '$1[已隐藏]'
    );
};

const redactError = (error?: TestError) => {
  if (!error) return;
  if (error.message) error.message = redact(error.message);
  if (error.stack) error.stack = redact(error.stack);
  if (error.value) error.value = redact(error.value);
  if (error.snippet) error.snippet = redact(error.snippet);
};

/** 在 list/HTML/JSON reporter 接收事件前隐藏输入值和协议参数。 */
export default class RedactReporter implements Reporter {
  onStepBegin = (_test: TestCase, _result: TestResult, step: TestStep) => {
    step.title = redact(step.title);
  };
  onStepEnd = (_test: TestCase, _result: TestResult, step: TestStep) => {
    step.title = redact(step.title);
    redactError(step.error);
  };
  onTestEnd = (_test: TestCase, result: TestResult) => {
    result.errors.forEach(redactError);
  };
  onError = (error: TestError) => redactError(error);
}
