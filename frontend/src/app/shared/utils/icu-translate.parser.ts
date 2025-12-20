import { Injectable } from '@angular/core';
import {
  InterpolateFunction,
  TranslateDefaultParser,
} from '@ngx-translate/core';

type IcuType = 'plural' | 'select';

interface ParsedIcuExpression {
  start: number;
  end: number;
  variable: string;
  type: IcuType;
  body: string;
}

@Injectable({
  providedIn: 'root',
})
export class IcuTranslateParser extends TranslateDefaultParser {
  private pluralRulesCache = new Map<string, Intl.PluralRules>();

  override interpolate(
    expr: string | InterpolateFunction,
    params?: any
  ): any {
    if (typeof expr === 'string' && expr.includes('{')) {
      const processed = this.processIcu(expr, params);
      if (processed !== null) {
        return processed;
      }
    }

    return super.interpolate(expr, params);
  }

  private processIcu(
    expr: string,
    params?: Record<string, any>
  ): string | null {
    let cursor = 0;
    let output = '';
    let replaced = false;

    while (cursor < expr.length) {
      const start = expr.indexOf('{', cursor);
      if (start === -1) {
        output += expr.substring(cursor);
        break;
      }

      output += expr.substring(cursor, start);
      const parsed = this.parseIcuExpression(expr, start);
      if (!parsed) {
        output += '{';
        cursor = start + 1;
        continue;
      }

      output += this.resolveIcu(parsed, params);
      cursor = parsed.end;
      replaced = true;
    }

    return replaced ? output : null;
  }

  private parseIcuExpression(
    expr: string,
    start: number
  ): ParsedIcuExpression | null {
    let index = start + 1;
    index = this.skipWhitespace(expr, index);

    const varStart = index;
    while (index < expr.length && /[\w.]/.test(expr[index])) {
      index++;
    }
    const variable = expr.substring(varStart, index);
    if (!variable) {
      return null;
    }

    index = this.skipWhitespace(expr, index);
    if (expr[index] !== ',') {
      return null;
    }
    index++;

    index = this.skipWhitespace(expr, index);
    const typeStart = index;
    while (index < expr.length && /[a-zA-Z]/.test(expr[index])) {
      index++;
    }
    const type = expr.substring(typeStart, index) as IcuType;
    if (type !== 'plural' && type !== 'select') {
      return null;
    }

    index = this.skipWhitespace(expr, index);
    if (expr[index] !== ',') {
      return null;
    }
    index++;

    const bodyStart = index;
    let depth = 1;
    while (index < expr.length && depth > 0) {
      if (expr[index] === '{') {
        depth++;
      } else if (expr[index] === '}') {
        depth--;
      }
      index++;
    }

    if (depth !== 0) {
      return null;
    }

    const body = expr.substring(bodyStart, index - 1);

    return {
      start,
      end: index,
      variable,
      type,
      body,
    };
  }

  private resolveIcu(
    parsed: ParsedIcuExpression,
    params?: Record<string, any>
  ): string {
    const cases = this.extractCases(parsed.body);
    switch (parsed.type) {
      case 'plural':
        return this.resolvePlural(parsed.variable, cases, params);
      case 'select':
        return this.resolveSelect(parsed.variable, cases, params);
      default:
        return '';
    }
  }

  private resolvePlural(
    variable: string,
    cases: Record<string, string>,
    params?: Record<string, any>
  ): string {
    const raw = this.resolveValue(params, variable);
    const numeric = Number(raw);
    if (!isFinite(numeric)) {
      const other = cases['other'] ?? '';
      return this.interpolate(other, params);
    }

    const exactKey = `=${numeric}`;
    if (cases[exactKey]) {
      return this.interpolate(cases[exactKey], params);
    }

    const locale = this.detectLocale(params);
    const rules = this.getPluralRules(locale);
    const category = rules.select(numeric);
    const template = cases[category] ?? cases['other'] ?? '';
    const withNumber = this.replaceNumberSigns(template, numeric);
    return this.interpolate(withNumber, params);
  }

  private resolveSelect(
    variable: string,
    cases: Record<string, string>,
    params?: Record<string, any>
  ): string {
    const raw = this.resolveValue(params, variable);
    const str = raw === undefined || raw === null ? '' : String(raw);
    const template = cases[str] ?? cases['other'] ?? '';
    return this.interpolate(template, params);
  }

  private extractCases(body: string): Record<string, string> {
    const entries: Record<string, string> = {};
    let index = 0;

    while (index < body.length) {
      index = this.skipWhitespace(body, index);
      if (index >= body.length) {
        break;
      }

      const keyStart = index;
      while (index < body.length && !/\s/.test(body[index]) && body[index] !== '{') {
        index++;
      }
      const key = body.substring(keyStart, index);
      if (!key) {
        break;
      }

      index = this.skipWhitespace(body, index);
      if (body[index] !== '{') {
        break;
      }
      index++;

      let depth = 1;
      const valueStart = index;
      while (index < body.length && depth > 0) {
        if (body[index] === '{') {
          depth++;
        } else if (body[index] === '}') {
          depth--;
        }
        index++;
      }

      if (depth !== 0) {
        break;
      }

      const value = body.substring(valueStart, index - 1).trim();
      entries[key] = value;
    }

    return entries;
  }

  private replaceNumberSigns(template: string, value: number): string {
    return template.replace(/#/g, value.toString());
  }

  private skipWhitespace(value: string, start: number): number {
    let index = start;
    while (index < value.length && /\s/.test(value[index])) {
      index++;
    }
    return index;
  }

  private detectLocale(params?: Record<string, any>): string {
    if (params && typeof params['__lang'] === 'string') {
      return params['__lang'];
    }

    if (typeof document !== 'undefined') {
      const lang = document.documentElement?.lang;
      if (lang) {
        return lang;
      }
    }

    return 'en';
  }

  private getPluralRules(locale: string): Intl.PluralRules {
    if (!this.pluralRulesCache.has(locale)) {
      this.pluralRulesCache.set(locale, new Intl.PluralRules(locale));
    }
    return this.pluralRulesCache.get(locale)!;
  }

  private resolveValue(
    params: Record<string, any> | undefined,
    path: string
  ): any {
    if (!params) {
      return undefined;
    }

    if (!path.includes('.')) {
      return params[path];
    }

    return path.split('.').reduce<any>((acc, key) => {
      if (acc === undefined || acc === null) {
        return undefined;
      }
      return acc[key];
    }, params);
  }
}
