#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@octokit/request-error/dist-src/index.js
var RequestError;
var init_dist_src = __esm({
  "node_modules/@octokit/request-error/dist-src/index.js"() {
    RequestError = class extends Error {
      name;
      /**
       * http status code
       */
      status;
      /**
       * Request options that lead to the error.
       */
      request;
      /**
       * Response object if a response was received
       */
      response;
      constructor(message, statusCode, options) {
        super(message, { cause: options.cause });
        this.name = "HttpError";
        this.status = Number.parseInt(statusCode);
        if (Number.isNaN(this.status)) {
          this.status = 0;
        }
        if ("response" in options) {
          this.response = options.response;
        }
        const requestCopy = Object.assign({}, options.request);
        if (options.request.headers.authorization) {
          requestCopy.headers = Object.assign({}, options.request.headers, {
            authorization: options.request.headers.authorization.replace(
              /(?<! ) .*$/,
              " [REDACTED]"
            )
          });
        }
        requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
        this.request = requestCopy;
      }
    };
  }
});

// node_modules/universal-user-agent/index.js
function getUserAgent() {
  if (typeof navigator === "object" && "userAgent" in navigator) {
    return navigator.userAgent;
  }
  if (typeof process === "object" && process.version !== void 0) {
    return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
  }
  return "<environment undetectable>";
}
var init_universal_user_agent = __esm({
  "node_modules/universal-user-agent/index.js"() {
  }
});

// node_modules/before-after-hook/lib/register.js
function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }
  if (!options) {
    options = {};
  }
  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name2) => {
      return register.bind(null, state, name2, callback, options);
    }, method)();
  }
  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }
    return state.registry[name].reduce((method2, registered) => {
      return registered.hook.bind(null, method2, options);
    }, method)();
  });
}
var init_register = __esm({
  "node_modules/before-after-hook/lib/register.js"() {
  }
});

// node_modules/before-after-hook/lib/add.js
function addHook(state, kind, name, hook2) {
  const orig = hook2;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }
  if (kind === "before") {
    hook2 = (method, options) => {
      return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
    };
  }
  if (kind === "after") {
    hook2 = (method, options) => {
      let result;
      return Promise.resolve().then(method.bind(null, options)).then((result_) => {
        result = result_;
        return orig(result, options);
      }).then(() => {
        return result;
      });
    };
  }
  if (kind === "error") {
    hook2 = (method, options) => {
      return Promise.resolve().then(method.bind(null, options)).catch((error) => {
        return orig(error, options);
      });
    };
  }
  state.registry[name].push({
    hook: hook2,
    orig
  });
}
var init_add = __esm({
  "node_modules/before-after-hook/lib/add.js"() {
  }
});

// node_modules/before-after-hook/lib/remove.js
function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }
  const index = state.registry[name].map((registered) => {
    return registered.orig;
  }).indexOf(method);
  if (index === -1) {
    return;
  }
  state.registry[name].splice(index, 1);
}
var init_remove = __esm({
  "node_modules/before-after-hook/lib/remove.js"() {
  }
});

// node_modules/before-after-hook/index.js
function bindApi(hook2, state, name) {
  const removeHookRef = bindable(removeHook, null).apply(
    null,
    name ? [state, name] : [state]
  );
  hook2.api = { remove: removeHookRef };
  hook2.remove = removeHookRef;
  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = name ? [state, kind, name] : [state, kind];
    hook2[kind] = hook2.api[kind] = bindable(addHook, null).apply(null, args);
  });
}
function Singular() {
  const singularHookName = /* @__PURE__ */ Symbol("Singular");
  const singularHookState = {
    registry: {}
  };
  const singularHook = register.bind(null, singularHookState, singularHookName);
  bindApi(singularHook, singularHookState, singularHookName);
  return singularHook;
}
function Collection() {
  const state = {
    registry: {}
  };
  const hook2 = register.bind(null, state);
  bindApi(hook2, state);
  return hook2;
}
var bind, bindable, before_after_hook_default;
var init_before_after_hook = __esm({
  "node_modules/before-after-hook/index.js"() {
    init_register();
    init_add();
    init_remove();
    bind = Function.bind;
    bindable = bind.bind(bind);
    before_after_hook_default = { Singular, Collection };
  }
});

// node_modules/@octokit/endpoint/dist-bundle/index.js
function lowercaseKeys(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}
function removeUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}
function merge2(defaults, route, options) {
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys(options.headers);
  removeUndefinedProperties(options);
  removeUndefinedProperties(options.headers);
  const mergedOptions = mergeDeep(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && defaults.mediaType.previews?.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}
function addQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}
function removeNonChars(variableName) {
  return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
  const matches = url.match(urlVariableRegex);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}
function omit(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}
function encodeReserved(str2) {
  return str2.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved(str2) {
  return encodeURIComponent(str2).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
  if (key) {
    return encodeUnreserved(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue(operator, value, isKeyOperator(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            result.push(
              encodeValue(operator, value2, isKeyOperator(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              result.push(encodeValue(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            tmp.push(encodeValue(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              tmp.push(encodeUnreserved(k));
              tmp.push(encodeValue(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator(operator)) {
          result.push(encodeUnreserved(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined(value)) {
        result.push(encodeUnreserved(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl(template) {
  return {
    expand: expand.bind(null, template)
  };
}
function expand(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}
function parse(options) {
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames(url);
  url = parseUrl(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if (options.mediaType.previews?.length) {
        const previewsFromAcceptHeader = headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}
function endpointWithDefaults(defaults, route, options) {
  return parse(merge2(defaults, route, options));
}
function withDefaults(oldDefaults, newDefaults) {
  const DEFAULTS2 = merge2(oldDefaults, newDefaults);
  const endpoint2 = endpointWithDefaults.bind(null, DEFAULTS2);
  return Object.assign(endpoint2, {
    DEFAULTS: DEFAULTS2,
    defaults: withDefaults.bind(null, DEFAULTS2),
    merge: merge2.bind(null, DEFAULTS2),
    parse
  });
}
var VERSION, userAgent, DEFAULTS, urlVariableRegex, endpoint;
var init_dist_bundle = __esm({
  "node_modules/@octokit/endpoint/dist-bundle/index.js"() {
    init_universal_user_agent();
    VERSION = "0.0.0-development";
    userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`;
    DEFAULTS = {
      method: "GET",
      baseUrl: "https://api.github.com",
      headers: {
        accept: "application/vnd.github.v3+json",
        "user-agent": userAgent
      },
      mediaType: {
        format: ""
      }
    };
    urlVariableRegex = /\{[^{}}]+\}/g;
    endpoint = withDefaults(null, DEFAULTS);
  }
});

// node_modules/fast-content-type-parse/index.js
var require_fast_content_type_parse = __commonJS({
  "node_modules/fast-content-type-parse/index.js"(exports, module) {
    "use strict";
    var NullObject = function NullObject2() {
    };
    NullObject.prototype = /* @__PURE__ */ Object.create(null);
    var paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu;
    var quotedPairRE = /\\([\v\u0020-\u00ff])/gu;
    var mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u;
    var defaultContentType = { type: "", parameters: new NullObject() };
    Object.freeze(defaultContentType.parameters);
    Object.freeze(defaultContentType);
    function parse2(header) {
      if (typeof header !== "string") {
        throw new TypeError("argument header is required and must be a string");
      }
      let index = header.indexOf(";");
      const type2 = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type2) === false) {
        throw new TypeError("invalid media type");
      }
      const result = {
        type: type2.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          throw new TypeError("invalid parameter format");
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        throw new TypeError("invalid parameter format");
      }
      return result;
    }
    function safeParse2(header) {
      if (typeof header !== "string") {
        return defaultContentType;
      }
      let index = header.indexOf(";");
      const type2 = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type2) === false) {
        return defaultContentType;
      }
      const result = {
        type: type2.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          return defaultContentType;
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        return defaultContentType;
      }
      return result;
    }
    module.exports.default = { parse: parse2, safeParse: safeParse2 };
    module.exports.parse = parse2;
    module.exports.safeParse = safeParse2;
    module.exports.defaultContentType = defaultContentType;
  }
});

// node_modules/json-with-bigint/json-with-bigint.js
var intRegex, noiseValue, originalStringify, originalParse, customFormat, bigIntsStringify, noiseStringify, JSONStringify, featureCache, isContextSourceSupported, convertMarkedBigIntsReviver, JSONParseV2, MAX_INT, MAX_DIGITS, stringsOrLargeNumbers, noiseValueWithQuotes, JSONParse;
var init_json_with_bigint = __esm({
  "node_modules/json-with-bigint/json-with-bigint.js"() {
    intRegex = /^-?\d+$/;
    noiseValue = /^-?\d+n+$/;
    originalStringify = JSON.stringify;
    originalParse = JSON.parse;
    customFormat = /^-?\d+n$/;
    bigIntsStringify = /([\[:])?"(-?\d+)n"($|([\\n]|\s)*(\s|[\\n])*[,\}\]])/g;
    noiseStringify = /([\[:])?("-?\d+n+)n("$|"([\\n]|\s)*(\s|[\\n])*[,\}\]])/g;
    JSONStringify = (value, replacer, space) => {
      if ("rawJSON" in JSON) {
        return originalStringify(
          value,
          (key, value2) => {
            if (typeof value2 === "bigint") return JSON.rawJSON(value2.toString());
            if (typeof replacer === "function") return replacer(key, value2);
            if (Array.isArray(replacer) && replacer.includes(key)) return value2;
            return value2;
          },
          space
        );
      }
      if (!value) return originalStringify(value, replacer, space);
      const convertedToCustomJSON = originalStringify(
        value,
        (key, value2) => {
          const isNoise = typeof value2 === "string" && noiseValue.test(value2);
          if (isNoise) return value2.toString() + "n";
          if (typeof value2 === "bigint") return value2.toString() + "n";
          if (typeof replacer === "function") return replacer(key, value2);
          if (Array.isArray(replacer) && replacer.includes(key)) return value2;
          return value2;
        },
        space
      );
      const processedJSON = convertedToCustomJSON.replace(
        bigIntsStringify,
        "$1$2$3"
      );
      const denoisedJSON = processedJSON.replace(noiseStringify, "$1$2$3");
      return denoisedJSON;
    };
    featureCache = /* @__PURE__ */ new Map();
    isContextSourceSupported = () => {
      const parseFingerprint = JSON.parse.toString();
      if (featureCache.has(parseFingerprint)) {
        return featureCache.get(parseFingerprint);
      }
      try {
        const result = JSON.parse(
          "1",
          (_, __, context) => !!context?.source && context.source === "1"
        );
        featureCache.set(parseFingerprint, result);
        return result;
      } catch {
        featureCache.set(parseFingerprint, false);
        return false;
      }
    };
    convertMarkedBigIntsReviver = (key, value, context, userReviver) => {
      const isCustomFormatBigInt = typeof value === "string" && customFormat.test(value);
      if (isCustomFormatBigInt) return BigInt(value.slice(0, -1));
      const isNoiseValue = typeof value === "string" && noiseValue.test(value);
      if (isNoiseValue) return value.slice(0, -1);
      if (typeof userReviver !== "function") return value;
      return userReviver(key, value, context);
    };
    JSONParseV2 = (text, reviver) => {
      return JSON.parse(text, (key, value, context) => {
        const isBigNumber = typeof value === "number" && (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER);
        const isInt = context && intRegex.test(context.source);
        const isBigInt = isBigNumber && isInt;
        if (isBigInt) return BigInt(context.source);
        if (typeof reviver !== "function") return value;
        return reviver(key, value, context);
      });
    };
    MAX_INT = Number.MAX_SAFE_INTEGER.toString();
    MAX_DIGITS = MAX_INT.length;
    stringsOrLargeNumbers = /"(?:\\.|[^"])*"|-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/g;
    noiseValueWithQuotes = /^"-?\d+n+"$/;
    JSONParse = (text, reviver) => {
      if (!text) return originalParse(text, reviver);
      if (isContextSourceSupported()) return JSONParseV2(text, reviver);
      const serializedData = text.replace(
        stringsOrLargeNumbers,
        (text2, digits, fractional, exponential) => {
          const isString = text2[0] === '"';
          const isNoise = isString && noiseValueWithQuotes.test(text2);
          if (isNoise) return text2.substring(0, text2.length - 1) + 'n"';
          const isFractionalOrExponential = fractional || exponential;
          const isLessThanMaxSafeInt = digits && (digits.length < MAX_DIGITS || digits.length === MAX_DIGITS && digits <= MAX_INT);
          if (isString || isFractionalOrExponential || isLessThanMaxSafeInt)
            return text2;
          return '"' + text2 + 'n"';
        }
      );
      return originalParse(
        serializedData,
        (key, value, context) => convertMarkedBigIntsReviver(key, value, context, reviver)
      );
    };
  }
});

// node_modules/@octokit/request/dist-bundle/index.js
function isPlainObject2(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
async function fetchWrapper(requestOptions) {
  const fetch = requestOptions.request?.fetch || globalThis.fetch;
  if (!fetch) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = requestOptions.request?.log || console;
  const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
  const body = isPlainObject2(requestOptions.body) || Array.isArray(requestOptions.body) ? JSONStringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: requestOptions.request?.redirect,
      headers: requestHeaders,
      signal: requestOptions.request?.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError(toErrorMessage(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(noop);
  }
  const mimetype = (0, import_fast_content_type_parse.safeParse)(contentType);
  if (isJSONResponse(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSONParse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") {
    return response.text().catch(noop);
  } else {
    return response.arrayBuffer().catch(
      /* v8 ignore next -- @preserve */
      () => new ArrayBuffer(0)
    );
  }
}
function isJSONResponse(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults2(oldEndpoint, newDefaults) {
  const endpoint2 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint2.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper(endpoint2.parse(endpointOptions));
    }
    const request2 = (route2, parameters2) => {
      return fetchWrapper(
        endpoint2.parse(endpoint2.merge(route2, parameters2))
      );
    };
    Object.assign(request2, {
      endpoint: endpoint2,
      defaults: withDefaults2.bind(null, endpoint2)
    });
    return endpointOptions.request.hook(request2, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint2,
    defaults: withDefaults2.bind(null, endpoint2)
  });
}
var import_fast_content_type_parse, VERSION2, defaults_default, noop, request;
var init_dist_bundle2 = __esm({
  "node_modules/@octokit/request/dist-bundle/index.js"() {
    init_dist_bundle();
    init_universal_user_agent();
    import_fast_content_type_parse = __toESM(require_fast_content_type_parse(), 1);
    init_json_with_bigint();
    init_dist_src();
    VERSION2 = "10.0.8";
    defaults_default = {
      headers: {
        "user-agent": `octokit-request.js/${VERSION2} ${getUserAgent()}`
      }
    };
    noop = () => "";
    request = withDefaults2(endpoint, defaults_default);
  }
});

// node_modules/@octokit/graphql/dist-bundle/index.js
function _buildMessageForResponseErrors(data) {
  return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
function graphql(request2, query, options) {
  if (options) {
    if (typeof query === "string" && "query" in options) {
      return Promise.reject(
        new Error(`[@octokit/graphql] "query" cannot be used as variable name`)
      );
    }
    for (const key in options) {
      if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
      return Promise.reject(
        new Error(
          `[@octokit/graphql] "${key}" cannot be used as variable name`
        )
      );
    }
  }
  const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
  const requestOptions = Object.keys(
    parsedOptions
  ).reduce((result, key) => {
    if (NON_VARIABLE_OPTIONS.includes(key)) {
      result[key] = parsedOptions[key];
      return result;
    }
    if (!result.variables) {
      result.variables = {};
    }
    result.variables[key] = parsedOptions[key];
    return result;
  }, {});
  const baseUrl = parsedOptions.baseUrl || request2.endpoint.DEFAULTS.baseUrl;
  if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
    requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
  }
  return request2(requestOptions).then((response) => {
    if (response.data.errors) {
      const headers = {};
      for (const key of Object.keys(response.headers)) {
        headers[key] = response.headers[key];
      }
      throw new GraphqlResponseError(
        requestOptions,
        headers,
        response.data
      );
    }
    return response.data.data;
  });
}
function withDefaults3(request2, newDefaults) {
  const newRequest = request2.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: withDefaults3.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}
function withCustomRequest(customRequest) {
  return withDefaults3(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}
var VERSION3, GraphqlResponseError, NON_VARIABLE_OPTIONS, FORBIDDEN_VARIABLE_OPTIONS, GHES_V3_SUFFIX_REGEX, graphql2;
var init_dist_bundle3 = __esm({
  "node_modules/@octokit/graphql/dist-bundle/index.js"() {
    init_dist_bundle2();
    init_universal_user_agent();
    VERSION3 = "0.0.0-development";
    GraphqlResponseError = class extends Error {
      constructor(request2, headers, response) {
        super(_buildMessageForResponseErrors(response));
        this.request = request2;
        this.headers = headers;
        this.response = response;
        this.errors = response.errors;
        this.data = response.data;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }
      }
      name = "GraphqlResponseError";
      errors;
      data;
    };
    NON_VARIABLE_OPTIONS = [
      "method",
      "baseUrl",
      "url",
      "headers",
      "request",
      "query",
      "mediaType",
      "operationName"
    ];
    FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
    GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
    graphql2 = withDefaults3(request, {
      headers: {
        "user-agent": `octokit-graphql.js/${VERSION3} ${getUserAgent()}`
      },
      method: "POST",
      url: "/graphql"
    });
  }
});

// node_modules/@octokit/auth-token/dist-bundle/index.js
async function auth(token) {
  const isApp = isJWT(token);
  const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
  const isUserToServer = token.startsWith("ghu_");
  const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
  return {
    type: "token",
    token,
    tokenType
  };
}
function withAuthorizationPrefix(token) {
  if (token.split(/\./).length === 3) {
    return `bearer ${token}`;
  }
  return `token ${token}`;
}
async function hook(token, request2, route, parameters) {
  const endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  endpoint2.headers.authorization = withAuthorizationPrefix(token);
  return request2(endpoint2);
}
var b64url, sep, jwtRE, isJWT, createTokenAuth;
var init_dist_bundle4 = __esm({
  "node_modules/@octokit/auth-token/dist-bundle/index.js"() {
    b64url = "(?:[a-zA-Z0-9_-]+)";
    sep = "\\.";
    jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
    isJWT = jwtRE.test.bind(jwtRE);
    createTokenAuth = function createTokenAuth2(token) {
      if (!token) {
        throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
      }
      if (typeof token !== "string") {
        throw new Error(
          "[@octokit/auth-token] Token passed to createTokenAuth is not a string"
        );
      }
      token = token.replace(/^(token|bearer) +/i, "");
      return Object.assign(auth.bind(null, token), {
        hook: hook.bind(null, token)
      });
    };
  }
});

// node_modules/@octokit/core/dist-src/version.js
var VERSION4;
var init_version = __esm({
  "node_modules/@octokit/core/dist-src/version.js"() {
    VERSION4 = "7.0.6";
  }
});

// node_modules/@octokit/core/dist-src/index.js
function createLogger(logger = {}) {
  if (typeof logger.debug !== "function") {
    logger.debug = noop2;
  }
  if (typeof logger.info !== "function") {
    logger.info = noop2;
  }
  if (typeof logger.warn !== "function") {
    logger.warn = consoleWarn;
  }
  if (typeof logger.error !== "function") {
    logger.error = consoleError;
  }
  return logger;
}
var noop2, consoleWarn, consoleError, userAgentTrail, Octokit;
var init_dist_src2 = __esm({
  "node_modules/@octokit/core/dist-src/index.js"() {
    init_universal_user_agent();
    init_before_after_hook();
    init_dist_bundle2();
    init_dist_bundle3();
    init_dist_bundle4();
    init_version();
    noop2 = () => {
    };
    consoleWarn = console.warn.bind(console);
    consoleError = console.error.bind(console);
    userAgentTrail = `octokit-core.js/${VERSION4} ${getUserAgent()}`;
    Octokit = class {
      static VERSION = VERSION4;
      static defaults(defaults) {
        const OctokitWithDefaults = class extends this {
          constructor(...args) {
            const options = args[0] || {};
            if (typeof defaults === "function") {
              super(defaults(options));
              return;
            }
            super(
              Object.assign(
                {},
                defaults,
                options,
                options.userAgent && defaults.userAgent ? {
                  userAgent: `${options.userAgent} ${defaults.userAgent}`
                } : null
              )
            );
          }
        };
        return OctokitWithDefaults;
      }
      static plugins = [];
      /**
       * Attach a plugin (or many) to your Octokit instance.
       *
       * @example
       * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
       */
      static plugin(...newPlugins) {
        const currentPlugins = this.plugins;
        const NewOctokit = class extends this {
          static plugins = currentPlugins.concat(
            newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
          );
        };
        return NewOctokit;
      }
      constructor(options = {}) {
        const hook2 = new before_after_hook_default.Collection();
        const requestDefaults = {
          baseUrl: request.endpoint.DEFAULTS.baseUrl,
          headers: {},
          request: Object.assign({}, options.request, {
            // @ts-ignore internal usage only, no need to type
            hook: hook2.bind(null, "request")
          }),
          mediaType: {
            previews: [],
            format: ""
          }
        };
        requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
        if (options.baseUrl) {
          requestDefaults.baseUrl = options.baseUrl;
        }
        if (options.previews) {
          requestDefaults.mediaType.previews = options.previews;
        }
        if (options.timeZone) {
          requestDefaults.headers["time-zone"] = options.timeZone;
        }
        this.request = request.defaults(requestDefaults);
        this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
        this.log = createLogger(options.log);
        this.hook = hook2;
        if (!options.authStrategy) {
          if (!options.auth) {
            this.auth = async () => ({
              type: "unauthenticated"
            });
          } else {
            const auth2 = createTokenAuth(options.auth);
            hook2.wrap("request", auth2.hook);
            this.auth = auth2;
          }
        } else {
          const { authStrategy, ...otherOptions } = options;
          const auth2 = authStrategy(
            Object.assign(
              {
                request: this.request,
                log: this.log,
                // we pass the current octokit instance as well as its constructor options
                // to allow for authentication strategies that return a new octokit instance
                // that shares the same internal state as the current one. The original
                // requirement for this was the "event-octokit" authentication strategy
                // of https://github.com/probot/octokit-auth-probot.
                octokit: this,
                octokitOptions: otherOptions
              },
              options.auth
            )
          );
          hook2.wrap("request", auth2.hook);
          this.auth = auth2;
        }
        const classConstructor = this.constructor;
        for (let i = 0; i < classConstructor.plugins.length; ++i) {
          Object.assign(this, classConstructor.plugins[i](this, options));
        }
      }
      // assigned during constructor
      request;
      graphql;
      log;
      hook;
      // TODO: type `octokit.auth` based on passed options.authStrategy
      auth;
    };
  }
});

// node_modules/@octokit/plugin-request-log/dist-src/version.js
var VERSION5;
var init_version2 = __esm({
  "node_modules/@octokit/plugin-request-log/dist-src/version.js"() {
    VERSION5 = "6.0.0";
  }
});

// node_modules/@octokit/plugin-request-log/dist-src/index.js
function requestLog(octokit) {
  octokit.hook.wrap("request", (request2, options) => {
    octokit.log.debug("request", options);
    const start = Date.now();
    const requestOptions = octokit.request.endpoint.parse(options);
    const path = requestOptions.url.replace(options.baseUrl, "");
    return request2(options).then((response) => {
      const requestId = response.headers["x-github-request-id"];
      octokit.log.info(
        `${requestOptions.method} ${path} - ${response.status} with id ${requestId} in ${Date.now() - start}ms`
      );
      return response;
    }).catch((error) => {
      const requestId = error.response?.headers["x-github-request-id"] || "UNKNOWN";
      octokit.log.error(
        `${requestOptions.method} ${path} - ${error.status} with id ${requestId} in ${Date.now() - start}ms`
      );
      throw error;
    });
  });
}
var init_dist_src3 = __esm({
  "node_modules/@octokit/plugin-request-log/dist-src/index.js"() {
    init_version2();
    requestLog.VERSION = VERSION5;
  }
});

// node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js
function normalizePaginatedListResponse(response) {
  if (!response.data) {
    return {
      ...response,
      data: []
    };
  }
  const responseNeedsNormalization = ("total_count" in response.data || "total_commits" in response.data) && !("url" in response.data);
  if (!responseNeedsNormalization) return response;
  const incompleteResults = response.data.incomplete_results;
  const repositorySelection = response.data.repository_selection;
  const totalCount = response.data.total_count;
  const totalCommits = response.data.total_commits;
  delete response.data.incomplete_results;
  delete response.data.repository_selection;
  delete response.data.total_count;
  delete response.data.total_commits;
  const namespaceKey = Object.keys(response.data)[0];
  const data = response.data[namespaceKey];
  response.data = data;
  if (typeof incompleteResults !== "undefined") {
    response.data.incomplete_results = incompleteResults;
  }
  if (typeof repositorySelection !== "undefined") {
    response.data.repository_selection = repositorySelection;
  }
  response.data.total_count = totalCount;
  response.data.total_commits = totalCommits;
  return response;
}
function iterator(octokit, route, parameters) {
  const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
  const requestMethod = typeof route === "function" ? route : octokit.request;
  const method = options.method;
  const headers = options.headers;
  let url = options.url;
  return {
    [Symbol.asyncIterator]: () => ({
      async next() {
        if (!url) return { done: true };
        try {
          const response = await requestMethod({ method, url, headers });
          const normalizedResponse = normalizePaginatedListResponse(response);
          url = ((normalizedResponse.headers.link || "").match(
            /<([^<>]+)>;\s*rel="next"/
          ) || [])[1];
          if (!url && "total_commits" in normalizedResponse.data) {
            const parsedUrl = new URL(normalizedResponse.url);
            const params = parsedUrl.searchParams;
            const page = parseInt(params.get("page") || "1", 10);
            const per_page = parseInt(params.get("per_page") || "250", 10);
            if (page * per_page < normalizedResponse.data.total_commits) {
              params.set("page", String(page + 1));
              url = parsedUrl.toString();
            }
          }
          return { value: normalizedResponse };
        } catch (error) {
          if (error.status !== 409) throw error;
          url = "";
          return {
            value: {
              status: 200,
              headers: {},
              data: []
            }
          };
        }
      }
    })
  };
}
function paginate(octokit, route, parameters, mapFn) {
  if (typeof parameters === "function") {
    mapFn = parameters;
    parameters = void 0;
  }
  return gather(
    octokit,
    [],
    iterator(octokit, route, parameters)[Symbol.asyncIterator](),
    mapFn
  );
}
function gather(octokit, results, iterator2, mapFn) {
  return iterator2.next().then((result) => {
    if (result.done) {
      return results;
    }
    let earlyExit = false;
    function done() {
      earlyExit = true;
    }
    results = results.concat(
      mapFn ? mapFn(result.value, done) : result.value.data
    );
    if (earlyExit) {
      return results;
    }
    return gather(octokit, results, iterator2, mapFn);
  });
}
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
var VERSION6, composePaginateRest;
var init_dist_bundle5 = __esm({
  "node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js"() {
    VERSION6 = "0.0.0-development";
    composePaginateRest = Object.assign(paginate, {
      iterator
    });
    paginateRest.VERSION = VERSION6;
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js
var VERSION7;
var init_version3 = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js"() {
    VERSION7 = "17.0.0";
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js
var Endpoints, endpoints_default;
var init_endpoints = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js"() {
    Endpoints = {
      actions: {
        addCustomLabelsToSelfHostedRunnerForOrg: [
          "POST /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        addCustomLabelsToSelfHostedRunnerForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        addRepoAccessToSelfHostedRunnerGroupInOrg: [
          "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgVariable: [
          "PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
        ],
        approveWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"
        ],
        cancelWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"
        ],
        createEnvironmentVariable: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/variables"
        ],
        createHostedRunnerForOrg: ["POST /orgs/{org}/actions/hosted-runners"],
        createOrUpdateEnvironmentSecret: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"
        ],
        createOrgVariable: ["POST /orgs/{org}/actions/variables"],
        createRegistrationTokenForOrg: [
          "POST /orgs/{org}/actions/runners/registration-token"
        ],
        createRegistrationTokenForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/registration-token"
        ],
        createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
        createRemoveTokenForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/remove-token"
        ],
        createRepoVariable: ["POST /repos/{owner}/{repo}/actions/variables"],
        createWorkflowDispatch: [
          "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"
        ],
        deleteActionsCacheById: [
          "DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}"
        ],
        deleteActionsCacheByKey: [
          "DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}"
        ],
        deleteArtifact: [
          "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"
        ],
        deleteCustomImageFromOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
        ],
        deleteCustomImageVersionFromOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
        ],
        deleteEnvironmentSecret: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        deleteEnvironmentVariable: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        deleteHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
        deleteOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"
        ],
        deleteRepoVariable: [
          "DELETE /repos/{owner}/{repo}/actions/variables/{name}"
        ],
        deleteSelfHostedRunnerFromOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}"
        ],
        deleteSelfHostedRunnerFromRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"
        ],
        deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
        deleteWorkflowRunLogs: [
          "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
        ],
        disableSelectedRepositoryGithubActionsOrganization: [
          "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"
        ],
        disableWorkflow: [
          "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"
        ],
        downloadArtifact: [
          "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"
        ],
        downloadJobLogsForWorkflowRun: [
          "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
        ],
        downloadWorkflowRunAttemptLogs: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"
        ],
        downloadWorkflowRunLogs: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
        ],
        enableSelectedRepositoryGithubActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"
        ],
        enableWorkflow: [
          "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"
        ],
        forceCancelWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel"
        ],
        generateRunnerJitconfigForOrg: [
          "POST /orgs/{org}/actions/runners/generate-jitconfig"
        ],
        generateRunnerJitconfigForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig"
        ],
        getActionsCacheList: ["GET /repos/{owner}/{repo}/actions/caches"],
        getActionsCacheUsage: ["GET /repos/{owner}/{repo}/actions/cache/usage"],
        getActionsCacheUsageByRepoForOrg: [
          "GET /orgs/{org}/actions/cache/usage-by-repository"
        ],
        getActionsCacheUsageForOrg: ["GET /orgs/{org}/actions/cache/usage"],
        getAllowedActionsOrganization: [
          "GET /orgs/{org}/actions/permissions/selected-actions"
        ],
        getAllowedActionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/selected-actions"
        ],
        getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
        getCustomImageForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
        ],
        getCustomImageVersionForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
        ],
        getCustomOidcSubClaimForRepo: [
          "GET /repos/{owner}/{repo}/actions/oidc/customization/sub"
        ],
        getEnvironmentPublicKey: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key"
        ],
        getEnvironmentSecret: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        getEnvironmentVariable: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        getGithubActionsDefaultWorkflowPermissionsOrganization: [
          "GET /orgs/{org}/actions/permissions/workflow"
        ],
        getGithubActionsDefaultWorkflowPermissionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/workflow"
        ],
        getGithubActionsPermissionsOrganization: [
          "GET /orgs/{org}/actions/permissions"
        ],
        getGithubActionsPermissionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions"
        ],
        getHostedRunnerForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        getHostedRunnersGithubOwnedImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/github-owned"
        ],
        getHostedRunnersLimitsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/limits"
        ],
        getHostedRunnersMachineSpecsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/machine-sizes"
        ],
        getHostedRunnersPartnerImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/partner"
        ],
        getHostedRunnersPlatformsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/platforms"
        ],
        getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
        getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
        getOrgVariable: ["GET /orgs/{org}/actions/variables/{name}"],
        getPendingDeploymentsForRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
        ],
        getRepoPermissions: [
          "GET /repos/{owner}/{repo}/actions/permissions",
          {},
          { renamed: ["actions", "getGithubActionsPermissionsRepository"] }
        ],
        getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
        getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
        getRepoVariable: ["GET /repos/{owner}/{repo}/actions/variables/{name}"],
        getReviewsForRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"
        ],
        getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
        getSelfHostedRunnerForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/{runner_id}"
        ],
        getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
        getWorkflowAccessToRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/access"
        ],
        getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
        getWorkflowRunAttempt: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"
        ],
        getWorkflowRunUsage: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"
        ],
        getWorkflowUsage: [
          "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"
        ],
        listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
        listCustomImageVersionsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions"
        ],
        listCustomImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom"
        ],
        listEnvironmentSecrets: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets"
        ],
        listEnvironmentVariables: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/variables"
        ],
        listGithubHostedRunnersInGroupForOrg: [
          "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners"
        ],
        listHostedRunnersForOrg: ["GET /orgs/{org}/actions/hosted-runners"],
        listJobsForWorkflowRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
        ],
        listJobsForWorkflowRunAttempt: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"
        ],
        listLabelsForSelfHostedRunnerForOrg: [
          "GET /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        listLabelsForSelfHostedRunnerForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
        listOrgVariables: ["GET /orgs/{org}/actions/variables"],
        listRepoOrganizationSecrets: [
          "GET /repos/{owner}/{repo}/actions/organization-secrets"
        ],
        listRepoOrganizationVariables: [
          "GET /repos/{owner}/{repo}/actions/organization-variables"
        ],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
        listRepoVariables: ["GET /repos/{owner}/{repo}/actions/variables"],
        listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
        listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
        listRunnerApplicationsForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/downloads"
        ],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/actions/secrets/{secret_name}/repositories"
        ],
        listSelectedReposForOrgVariable: [
          "GET /orgs/{org}/actions/variables/{name}/repositories"
        ],
        listSelectedRepositoriesEnabledGithubActionsOrganization: [
          "GET /orgs/{org}/actions/permissions/repositories"
        ],
        listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
        listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
        listWorkflowRunArtifacts: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"
        ],
        listWorkflowRuns: [
          "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
        ],
        listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
        reRunJobForWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun"
        ],
        reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
        reRunWorkflowFailedJobs: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs"
        ],
        removeAllCustomLabelsFromSelfHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        removeAllCustomLabelsFromSelfHostedRunnerForRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        removeCustomLabelFromSelfHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}"
        ],
        removeCustomLabelFromSelfHostedRunnerForRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
        ],
        removeSelectedRepoFromOrgVariable: [
          "DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
        ],
        reviewCustomGatesForRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule"
        ],
        reviewPendingDeploymentsForRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
        ],
        setAllowedActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/selected-actions"
        ],
        setAllowedActionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"
        ],
        setCustomLabelsForSelfHostedRunnerForOrg: [
          "PUT /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        setCustomLabelsForSelfHostedRunnerForRepo: [
          "PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        setCustomOidcSubClaimForRepo: [
          "PUT /repos/{owner}/{repo}/actions/oidc/customization/sub"
        ],
        setGithubActionsDefaultWorkflowPermissionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/workflow"
        ],
        setGithubActionsDefaultWorkflowPermissionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/workflow"
        ],
        setGithubActionsPermissionsOrganization: [
          "PUT /orgs/{org}/actions/permissions"
        ],
        setGithubActionsPermissionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"
        ],
        setSelectedReposForOrgVariable: [
          "PUT /orgs/{org}/actions/variables/{name}/repositories"
        ],
        setSelectedRepositoriesEnabledGithubActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/repositories"
        ],
        setWorkflowAccessToRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/access"
        ],
        updateEnvironmentVariable: [
          "PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        updateHostedRunnerForOrg: [
          "PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        updateOrgVariable: ["PATCH /orgs/{org}/actions/variables/{name}"],
        updateRepoVariable: [
          "PATCH /repos/{owner}/{repo}/actions/variables/{name}"
        ]
      },
      activity: {
        checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
        deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
        deleteThreadSubscription: [
          "DELETE /notifications/threads/{thread_id}/subscription"
        ],
        getFeeds: ["GET /feeds"],
        getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
        getThread: ["GET /notifications/threads/{thread_id}"],
        getThreadSubscriptionForAuthenticatedUser: [
          "GET /notifications/threads/{thread_id}/subscription"
        ],
        listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
        listNotificationsForAuthenticatedUser: ["GET /notifications"],
        listOrgEventsForAuthenticatedUser: [
          "GET /users/{username}/events/orgs/{org}"
        ],
        listPublicEvents: ["GET /events"],
        listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
        listPublicEventsForUser: ["GET /users/{username}/events/public"],
        listPublicOrgEvents: ["GET /orgs/{org}/events"],
        listReceivedEventsForUser: ["GET /users/{username}/received_events"],
        listReceivedPublicEventsForUser: [
          "GET /users/{username}/received_events/public"
        ],
        listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
        listRepoNotificationsForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/notifications"
        ],
        listReposStarredByAuthenticatedUser: ["GET /user/starred"],
        listReposStarredByUser: ["GET /users/{username}/starred"],
        listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
        listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
        listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
        listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
        markNotificationsAsRead: ["PUT /notifications"],
        markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
        markThreadAsDone: ["DELETE /notifications/threads/{thread_id}"],
        markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
        setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
        setThreadSubscription: [
          "PUT /notifications/threads/{thread_id}/subscription"
        ],
        starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
        unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
      },
      apps: {
        addRepoToInstallation: [
          "PUT /user/installations/{installation_id}/repositories/{repository_id}",
          {},
          { renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"] }
        ],
        addRepoToInstallationForAuthenticatedUser: [
          "PUT /user/installations/{installation_id}/repositories/{repository_id}"
        ],
        checkToken: ["POST /applications/{client_id}/token"],
        createFromManifest: ["POST /app-manifests/{code}/conversions"],
        createInstallationAccessToken: [
          "POST /app/installations/{installation_id}/access_tokens"
        ],
        deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
        deleteInstallation: ["DELETE /app/installations/{installation_id}"],
        deleteToken: ["DELETE /applications/{client_id}/token"],
        getAuthenticated: ["GET /app"],
        getBySlug: ["GET /apps/{app_slug}"],
        getInstallation: ["GET /app/installations/{installation_id}"],
        getOrgInstallation: ["GET /orgs/{org}/installation"],
        getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
        getSubscriptionPlanForAccount: [
          "GET /marketplace_listing/accounts/{account_id}"
        ],
        getSubscriptionPlanForAccountStubbed: [
          "GET /marketplace_listing/stubbed/accounts/{account_id}"
        ],
        getUserInstallation: ["GET /users/{username}/installation"],
        getWebhookConfigForApp: ["GET /app/hook/config"],
        getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
        listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
        listAccountsForPlanStubbed: [
          "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"
        ],
        listInstallationReposForAuthenticatedUser: [
          "GET /user/installations/{installation_id}/repositories"
        ],
        listInstallationRequestsForAuthenticatedApp: [
          "GET /app/installation-requests"
        ],
        listInstallations: ["GET /app/installations"],
        listInstallationsForAuthenticatedUser: ["GET /user/installations"],
        listPlans: ["GET /marketplace_listing/plans"],
        listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
        listReposAccessibleToInstallation: ["GET /installation/repositories"],
        listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
        listSubscriptionsForAuthenticatedUserStubbed: [
          "GET /user/marketplace_purchases/stubbed"
        ],
        listWebhookDeliveries: ["GET /app/hook/deliveries"],
        redeliverWebhookDelivery: [
          "POST /app/hook/deliveries/{delivery_id}/attempts"
        ],
        removeRepoFromInstallation: [
          "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
          {},
          { renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"] }
        ],
        removeRepoFromInstallationForAuthenticatedUser: [
          "DELETE /user/installations/{installation_id}/repositories/{repository_id}"
        ],
        resetToken: ["PATCH /applications/{client_id}/token"],
        revokeInstallationAccessToken: ["DELETE /installation/token"],
        scopeToken: ["POST /applications/{client_id}/token/scoped"],
        suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
        unsuspendInstallation: [
          "DELETE /app/installations/{installation_id}/suspended"
        ],
        updateWebhookConfigForApp: ["PATCH /app/hook/config"]
      },
      billing: {
        getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
        getGithubActionsBillingUser: [
          "GET /users/{username}/settings/billing/actions"
        ],
        getGithubBillingPremiumRequestUsageReportOrg: [
          "GET /organizations/{org}/settings/billing/premium_request/usage"
        ],
        getGithubBillingPremiumRequestUsageReportUser: [
          "GET /users/{username}/settings/billing/premium_request/usage"
        ],
        getGithubBillingUsageReportOrg: [
          "GET /organizations/{org}/settings/billing/usage"
        ],
        getGithubBillingUsageReportUser: [
          "GET /users/{username}/settings/billing/usage"
        ],
        getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
        getGithubPackagesBillingUser: [
          "GET /users/{username}/settings/billing/packages"
        ],
        getSharedStorageBillingOrg: [
          "GET /orgs/{org}/settings/billing/shared-storage"
        ],
        getSharedStorageBillingUser: [
          "GET /users/{username}/settings/billing/shared-storage"
        ]
      },
      campaigns: {
        createCampaign: ["POST /orgs/{org}/campaigns"],
        deleteCampaign: ["DELETE /orgs/{org}/campaigns/{campaign_number}"],
        getCampaignSummary: ["GET /orgs/{org}/campaigns/{campaign_number}"],
        listOrgCampaigns: ["GET /orgs/{org}/campaigns"],
        updateCampaign: ["PATCH /orgs/{org}/campaigns/{campaign_number}"]
      },
      checks: {
        create: ["POST /repos/{owner}/{repo}/check-runs"],
        createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
        get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
        getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
        listAnnotations: [
          "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"
        ],
        listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
        listForSuite: [
          "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"
        ],
        listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
        rerequestRun: [
          "POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"
        ],
        rerequestSuite: [
          "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"
        ],
        setSuitesPreferences: [
          "PATCH /repos/{owner}/{repo}/check-suites/preferences"
        ],
        update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
      },
      codeScanning: {
        commitAutofix: [
          "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits"
        ],
        createAutofix: [
          "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
        ],
        createVariantAnalysis: [
          "POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses"
        ],
        deleteAnalysis: [
          "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"
        ],
        deleteCodeqlDatabase: [
          "DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
        ],
        getAlert: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
          {},
          { renamedParameters: { alert_id: "alert_number" } }
        ],
        getAnalysis: [
          "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"
        ],
        getAutofix: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
        ],
        getCodeqlDatabase: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
        ],
        getDefaultSetup: ["GET /repos/{owner}/{repo}/code-scanning/default-setup"],
        getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
        getVariantAnalysis: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}"
        ],
        getVariantAnalysisRepoTask: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}"
        ],
        listAlertInstances: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"
        ],
        listAlertsForOrg: ["GET /orgs/{org}/code-scanning/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
        listAlertsInstances: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
          {},
          { renamed: ["codeScanning", "listAlertInstances"] }
        ],
        listCodeqlDatabases: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/databases"
        ],
        listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"
        ],
        updateDefaultSetup: [
          "PATCH /repos/{owner}/{repo}/code-scanning/default-setup"
        ],
        uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
      },
      codeSecurity: {
        attachConfiguration: [
          "POST /orgs/{org}/code-security/configurations/{configuration_id}/attach"
        ],
        attachEnterpriseConfiguration: [
          "POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach"
        ],
        createConfiguration: ["POST /orgs/{org}/code-security/configurations"],
        createConfigurationForEnterprise: [
          "POST /enterprises/{enterprise}/code-security/configurations"
        ],
        deleteConfiguration: [
          "DELETE /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        deleteConfigurationForEnterprise: [
          "DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ],
        detachConfiguration: [
          "DELETE /orgs/{org}/code-security/configurations/detach"
        ],
        getConfiguration: [
          "GET /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        getConfigurationForRepository: [
          "GET /repos/{owner}/{repo}/code-security-configuration"
        ],
        getConfigurationsForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations"
        ],
        getConfigurationsForOrg: ["GET /orgs/{org}/code-security/configurations"],
        getDefaultConfigurations: [
          "GET /orgs/{org}/code-security/configurations/defaults"
        ],
        getDefaultConfigurationsForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations/defaults"
        ],
        getRepositoriesForConfiguration: [
          "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories"
        ],
        getRepositoriesForEnterpriseConfiguration: [
          "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories"
        ],
        getSingleConfigurationForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ],
        setConfigurationAsDefault: [
          "PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults"
        ],
        setConfigurationAsDefaultForEnterprise: [
          "PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults"
        ],
        updateConfiguration: [
          "PATCH /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        updateEnterpriseConfiguration: [
          "PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ]
      },
      codesOfConduct: {
        getAllCodesOfConduct: ["GET /codes_of_conduct"],
        getConductCode: ["GET /codes_of_conduct/{key}"]
      },
      codespaces: {
        addRepositoryForSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        checkPermissionsForDevcontainer: [
          "GET /repos/{owner}/{repo}/codespaces/permissions_check"
        ],
        codespaceMachinesForAuthenticatedUser: [
          "GET /user/codespaces/{codespace_name}/machines"
        ],
        createForAuthenticatedUser: ["POST /user/codespaces"],
        createOrUpdateOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}"
        ],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        createOrUpdateSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}"
        ],
        createWithPrForAuthenticatedUser: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces"
        ],
        createWithRepoForAuthenticatedUser: [
          "POST /repos/{owner}/{repo}/codespaces"
        ],
        deleteForAuthenticatedUser: ["DELETE /user/codespaces/{codespace_name}"],
        deleteFromOrganization: [
          "DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        deleteSecretForAuthenticatedUser: [
          "DELETE /user/codespaces/secrets/{secret_name}"
        ],
        exportForAuthenticatedUser: [
          "POST /user/codespaces/{codespace_name}/exports"
        ],
        getCodespacesForUserInOrg: [
          "GET /orgs/{org}/members/{username}/codespaces"
        ],
        getExportDetailsForAuthenticatedUser: [
          "GET /user/codespaces/{codespace_name}/exports/{export_id}"
        ],
        getForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}"],
        getOrgPublicKey: ["GET /orgs/{org}/codespaces/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}"],
        getPublicKeyForAuthenticatedUser: [
          "GET /user/codespaces/secrets/public-key"
        ],
        getRepoPublicKey: [
          "GET /repos/{owner}/{repo}/codespaces/secrets/public-key"
        ],
        getRepoSecret: [
          "GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        getSecretForAuthenticatedUser: [
          "GET /user/codespaces/secrets/{secret_name}"
        ],
        listDevcontainersInRepositoryForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/devcontainers"
        ],
        listForAuthenticatedUser: ["GET /user/codespaces"],
        listInOrganization: [
          "GET /orgs/{org}/codespaces",
          {},
          { renamedParameters: { org_id: "org" } }
        ],
        listInRepositoryForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces"
        ],
        listOrgSecrets: ["GET /orgs/{org}/codespaces/secrets"],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/codespaces/secrets"],
        listRepositoriesForSecretForAuthenticatedUser: [
          "GET /user/codespaces/secrets/{secret_name}/repositories"
        ],
        listSecretsForAuthenticatedUser: ["GET /user/codespaces/secrets"],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
        ],
        preFlightWithRepoForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/new"
        ],
        publishForAuthenticatedUser: [
          "POST /user/codespaces/{codespace_name}/publish"
        ],
        removeRepositoryForSecretForAuthenticatedUser: [
          "DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        repoMachinesForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/machines"
        ],
        setRepositoriesForSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}/repositories"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
        ],
        startForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/start"],
        stopForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/stop"],
        stopInOrganization: [
          "POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop"
        ],
        updateForAuthenticatedUser: ["PATCH /user/codespaces/{codespace_name}"]
      },
      copilot: {
        addCopilotSeatsForTeams: [
          "POST /orgs/{org}/copilot/billing/selected_teams"
        ],
        addCopilotSeatsForUsers: [
          "POST /orgs/{org}/copilot/billing/selected_users"
        ],
        cancelCopilotSeatAssignmentForTeams: [
          "DELETE /orgs/{org}/copilot/billing/selected_teams"
        ],
        cancelCopilotSeatAssignmentForUsers: [
          "DELETE /orgs/{org}/copilot/billing/selected_users"
        ],
        copilotMetricsForOrganization: ["GET /orgs/{org}/copilot/metrics"],
        copilotMetricsForTeam: ["GET /orgs/{org}/team/{team_slug}/copilot/metrics"],
        getCopilotOrganizationDetails: ["GET /orgs/{org}/copilot/billing"],
        getCopilotSeatDetailsForUser: [
          "GET /orgs/{org}/members/{username}/copilot"
        ],
        listCopilotSeats: ["GET /orgs/{org}/copilot/billing/seats"]
      },
      credentials: { revoke: ["POST /credentials/revoke"] },
      dependabot: {
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
        ],
        createOrUpdateOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}"
        ],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        getAlert: ["GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
        getOrgPublicKey: ["GET /orgs/{org}/dependabot/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}"],
        getRepoPublicKey: [
          "GET /repos/{owner}/{repo}/dependabot/secrets/public-key"
        ],
        getRepoSecret: [
          "GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        listAlertsForEnterprise: [
          "GET /enterprises/{enterprise}/dependabot/alerts"
        ],
        listAlertsForOrg: ["GET /orgs/{org}/dependabot/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/dependabot/alerts"],
        listOrgSecrets: ["GET /orgs/{org}/dependabot/secrets"],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/dependabot/secrets"],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
        ],
        repositoryAccessForOrg: [
          "GET /organizations/{org}/dependabot/repository-access"
        ],
        setRepositoryAccessDefaultLevel: [
          "PUT /organizations/{org}/dependabot/repository-access/default-level"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
        ],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"
        ],
        updateRepositoryAccessForOrg: [
          "PATCH /organizations/{org}/dependabot/repository-access"
        ]
      },
      dependencyGraph: {
        createRepositorySnapshot: [
          "POST /repos/{owner}/{repo}/dependency-graph/snapshots"
        ],
        diffRange: [
          "GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}"
        ],
        exportSbom: ["GET /repos/{owner}/{repo}/dependency-graph/sbom"]
      },
      emojis: { get: ["GET /emojis"] },
      enterpriseTeamMemberships: {
        add: [
          "PUT /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ],
        bulkAdd: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/add"
        ],
        bulkRemove: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/remove"
        ],
        get: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ],
        list: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships"],
        remove: [
          "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ]
      },
      enterpriseTeamOrganizations: {
        add: [
          "PUT /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        bulkAdd: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/add"
        ],
        bulkRemove: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/remove"
        ],
        delete: [
          "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        getAssignment: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        getAssignments: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations"
        ]
      },
      enterpriseTeams: {
        create: ["POST /enterprises/{enterprise}/teams"],
        delete: ["DELETE /enterprises/{enterprise}/teams/{team_slug}"],
        get: ["GET /enterprises/{enterprise}/teams/{team_slug}"],
        list: ["GET /enterprises/{enterprise}/teams"],
        update: ["PATCH /enterprises/{enterprise}/teams/{team_slug}"]
      },
      gists: {
        checkIsStarred: ["GET /gists/{gist_id}/star"],
        create: ["POST /gists"],
        createComment: ["POST /gists/{gist_id}/comments"],
        delete: ["DELETE /gists/{gist_id}"],
        deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
        fork: ["POST /gists/{gist_id}/forks"],
        get: ["GET /gists/{gist_id}"],
        getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
        getRevision: ["GET /gists/{gist_id}/{sha}"],
        list: ["GET /gists"],
        listComments: ["GET /gists/{gist_id}/comments"],
        listCommits: ["GET /gists/{gist_id}/commits"],
        listForUser: ["GET /users/{username}/gists"],
        listForks: ["GET /gists/{gist_id}/forks"],
        listPublic: ["GET /gists/public"],
        listStarred: ["GET /gists/starred"],
        star: ["PUT /gists/{gist_id}/star"],
        unstar: ["DELETE /gists/{gist_id}/star"],
        update: ["PATCH /gists/{gist_id}"],
        updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
      },
      git: {
        createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
        createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
        createRef: ["POST /repos/{owner}/{repo}/git/refs"],
        createTag: ["POST /repos/{owner}/{repo}/git/tags"],
        createTree: ["POST /repos/{owner}/{repo}/git/trees"],
        deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
        getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
        getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
        getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
        getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
        getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
        listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
        updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
      },
      gitignore: {
        getAllTemplates: ["GET /gitignore/templates"],
        getTemplate: ["GET /gitignore/templates/{name}"]
      },
      hostedCompute: {
        createNetworkConfigurationForOrg: [
          "POST /orgs/{org}/settings/network-configurations"
        ],
        deleteNetworkConfigurationFromOrg: [
          "DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ],
        getNetworkConfigurationForOrg: [
          "GET /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ],
        getNetworkSettingsForOrg: [
          "GET /orgs/{org}/settings/network-settings/{network_settings_id}"
        ],
        listNetworkConfigurationsForOrg: [
          "GET /orgs/{org}/settings/network-configurations"
        ],
        updateNetworkConfigurationForOrg: [
          "PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ]
      },
      interactions: {
        getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
        getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
        getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
        getRestrictionsForYourPublicRepos: [
          "GET /user/interaction-limits",
          {},
          { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] }
        ],
        removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
        removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
        removeRestrictionsForRepo: [
          "DELETE /repos/{owner}/{repo}/interaction-limits"
        ],
        removeRestrictionsForYourPublicRepos: [
          "DELETE /user/interaction-limits",
          {},
          { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] }
        ],
        setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
        setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
        setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
        setRestrictionsForYourPublicRepos: [
          "PUT /user/interaction-limits",
          {},
          { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] }
        ]
      },
      issues: {
        addAssignees: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"
        ],
        addBlockedByDependency: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
        ],
        addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        addSubIssue: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
        ],
        checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
        checkUserCanBeAssignedToIssue: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}"
        ],
        create: ["POST /repos/{owner}/{repo}/issues"],
        createComment: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
        ],
        createLabel: ["POST /repos/{owner}/{repo}/labels"],
        createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
        deleteComment: [
          "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"
        ],
        deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
        deleteMilestone: [
          "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"
        ],
        get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
        getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
        getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
        getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
        getParent: ["GET /repos/{owner}/{repo}/issues/{issue_number}/parent"],
        list: ["GET /issues"],
        listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
        listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
        listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
        listDependenciesBlockedBy: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
        ],
        listDependenciesBlocking: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking"
        ],
        listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
        listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
        listEventsForTimeline: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"
        ],
        listForAuthenticatedUser: ["GET /user/issues"],
        listForOrg: ["GET /orgs/{org}/issues"],
        listForRepo: ["GET /repos/{owner}/{repo}/issues"],
        listLabelsForMilestone: [
          "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"
        ],
        listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
        listLabelsOnIssue: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/labels"
        ],
        listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
        listSubIssues: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
        ],
        lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        removeAllLabels: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"
        ],
        removeAssignees: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"
        ],
        removeDependencyBlockedBy: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}"
        ],
        removeLabel: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"
        ],
        removeSubIssue: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue"
        ],
        reprioritizeSubIssue: [
          "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority"
        ],
        setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
        updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
        updateMilestone: [
          "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"
        ]
      },
      licenses: {
        get: ["GET /licenses/{license}"],
        getAllCommonlyUsed: ["GET /licenses"],
        getForRepo: ["GET /repos/{owner}/{repo}/license"]
      },
      markdown: {
        render: ["POST /markdown"],
        renderRaw: [
          "POST /markdown/raw",
          { headers: { "content-type": "text/plain; charset=utf-8" } }
        ]
      },
      meta: {
        get: ["GET /meta"],
        getAllVersions: ["GET /versions"],
        getOctocat: ["GET /octocat"],
        getZen: ["GET /zen"],
        root: ["GET /"]
      },
      migrations: {
        deleteArchiveForAuthenticatedUser: [
          "DELETE /user/migrations/{migration_id}/archive"
        ],
        deleteArchiveForOrg: [
          "DELETE /orgs/{org}/migrations/{migration_id}/archive"
        ],
        downloadArchiveForOrg: [
          "GET /orgs/{org}/migrations/{migration_id}/archive"
        ],
        getArchiveForAuthenticatedUser: [
          "GET /user/migrations/{migration_id}/archive"
        ],
        getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
        getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
        listForAuthenticatedUser: ["GET /user/migrations"],
        listForOrg: ["GET /orgs/{org}/migrations"],
        listReposForAuthenticatedUser: [
          "GET /user/migrations/{migration_id}/repositories"
        ],
        listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
        listReposForUser: [
          "GET /user/migrations/{migration_id}/repositories",
          {},
          { renamed: ["migrations", "listReposForAuthenticatedUser"] }
        ],
        startForAuthenticatedUser: ["POST /user/migrations"],
        startForOrg: ["POST /orgs/{org}/migrations"],
        unlockRepoForAuthenticatedUser: [
          "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"
        ],
        unlockRepoForOrg: [
          "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"
        ]
      },
      oidc: {
        getOidcCustomSubTemplateForOrg: [
          "GET /orgs/{org}/actions/oidc/customization/sub"
        ],
        updateOidcCustomSubTemplateForOrg: [
          "PUT /orgs/{org}/actions/oidc/customization/sub"
        ]
      },
      orgs: {
        addSecurityManagerTeam: [
          "PUT /orgs/{org}/security-managers/teams/{team_slug}",
          {},
          {
            deprecated: "octokit.rest.orgs.addSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team"
          }
        ],
        assignTeamToOrgRole: [
          "PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
        ],
        assignUserToOrgRole: [
          "PUT /orgs/{org}/organization-roles/users/{username}/{role_id}"
        ],
        blockUser: ["PUT /orgs/{org}/blocks/{username}"],
        cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
        checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
        checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
        checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
        convertMemberToOutsideCollaborator: [
          "PUT /orgs/{org}/outside_collaborators/{username}"
        ],
        createArtifactStorageRecord: [
          "POST /orgs/{org}/artifacts/metadata/storage-record"
        ],
        createInvitation: ["POST /orgs/{org}/invitations"],
        createIssueType: ["POST /orgs/{org}/issue-types"],
        createWebhook: ["POST /orgs/{org}/hooks"],
        customPropertiesForOrgsCreateOrUpdateOrganizationValues: [
          "PATCH /organizations/{org}/org-properties/values"
        ],
        customPropertiesForOrgsGetOrganizationValues: [
          "GET /organizations/{org}/org-properties/values"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationDefinition: [
          "PUT /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationDefinitions: [
          "PATCH /orgs/{org}/properties/schema"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationValues: [
          "PATCH /orgs/{org}/properties/values"
        ],
        customPropertiesForReposDeleteOrganizationDefinition: [
          "DELETE /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposGetOrganizationDefinition: [
          "GET /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposGetOrganizationDefinitions: [
          "GET /orgs/{org}/properties/schema"
        ],
        customPropertiesForReposGetOrganizationValues: [
          "GET /orgs/{org}/properties/values"
        ],
        delete: ["DELETE /orgs/{org}"],
        deleteAttestationsBulk: ["POST /orgs/{org}/attestations/delete-request"],
        deleteAttestationsById: [
          "DELETE /orgs/{org}/attestations/{attestation_id}"
        ],
        deleteAttestationsBySubjectDigest: [
          "DELETE /orgs/{org}/attestations/digest/{subject_digest}"
        ],
        deleteIssueType: ["DELETE /orgs/{org}/issue-types/{issue_type_id}"],
        deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
        disableSelectedRepositoryImmutableReleasesOrganization: [
          "DELETE /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
        ],
        enableSelectedRepositoryImmutableReleasesOrganization: [
          "PUT /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
        ],
        get: ["GET /orgs/{org}"],
        getImmutableReleasesSettings: [
          "GET /orgs/{org}/settings/immutable-releases"
        ],
        getImmutableReleasesSettingsRepositories: [
          "GET /orgs/{org}/settings/immutable-releases/repositories"
        ],
        getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
        getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
        getOrgRole: ["GET /orgs/{org}/organization-roles/{role_id}"],
        getOrgRulesetHistory: ["GET /orgs/{org}/rulesets/{ruleset_id}/history"],
        getOrgRulesetVersion: [
          "GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}"
        ],
        getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
        getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
        getWebhookDelivery: [
          "GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"
        ],
        list: ["GET /organizations"],
        listAppInstallations: ["GET /orgs/{org}/installations"],
        listArtifactStorageRecords: [
          "GET /orgs/{org}/artifacts/{subject_digest}/metadata/storage-records"
        ],
        listAttestationRepositories: ["GET /orgs/{org}/attestations/repositories"],
        listAttestations: ["GET /orgs/{org}/attestations/{subject_digest}"],
        listAttestationsBulk: [
          "POST /orgs/{org}/attestations/bulk-list{?per_page,before,after}"
        ],
        listBlockedUsers: ["GET /orgs/{org}/blocks"],
        listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
        listForAuthenticatedUser: ["GET /user/orgs"],
        listForUser: ["GET /users/{username}/orgs"],
        listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
        listIssueTypes: ["GET /orgs/{org}/issue-types"],
        listMembers: ["GET /orgs/{org}/members"],
        listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
        listOrgRoleTeams: ["GET /orgs/{org}/organization-roles/{role_id}/teams"],
        listOrgRoleUsers: ["GET /orgs/{org}/organization-roles/{role_id}/users"],
        listOrgRoles: ["GET /orgs/{org}/organization-roles"],
        listOrganizationFineGrainedPermissions: [
          "GET /orgs/{org}/organization-fine-grained-permissions"
        ],
        listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
        listPatGrantRepositories: [
          "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories"
        ],
        listPatGrantRequestRepositories: [
          "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories"
        ],
        listPatGrantRequests: ["GET /orgs/{org}/personal-access-token-requests"],
        listPatGrants: ["GET /orgs/{org}/personal-access-tokens"],
        listPendingInvitations: ["GET /orgs/{org}/invitations"],
        listPublicMembers: ["GET /orgs/{org}/public_members"],
        listSecurityManagerTeams: [
          "GET /orgs/{org}/security-managers",
          {},
          {
            deprecated: "octokit.rest.orgs.listSecurityManagerTeams() is deprecated, see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams"
          }
        ],
        listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
        listWebhooks: ["GET /orgs/{org}/hooks"],
        pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
        redeliverWebhookDelivery: [
          "POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
        ],
        removeMember: ["DELETE /orgs/{org}/members/{username}"],
        removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
        removeOutsideCollaborator: [
          "DELETE /orgs/{org}/outside_collaborators/{username}"
        ],
        removePublicMembershipForAuthenticatedUser: [
          "DELETE /orgs/{org}/public_members/{username}"
        ],
        removeSecurityManagerTeam: [
          "DELETE /orgs/{org}/security-managers/teams/{team_slug}",
          {},
          {
            deprecated: "octokit.rest.orgs.removeSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team"
          }
        ],
        reviewPatGrantRequest: [
          "POST /orgs/{org}/personal-access-token-requests/{pat_request_id}"
        ],
        reviewPatGrantRequestsInBulk: [
          "POST /orgs/{org}/personal-access-token-requests"
        ],
        revokeAllOrgRolesTeam: [
          "DELETE /orgs/{org}/organization-roles/teams/{team_slug}"
        ],
        revokeAllOrgRolesUser: [
          "DELETE /orgs/{org}/organization-roles/users/{username}"
        ],
        revokeOrgRoleTeam: [
          "DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
        ],
        revokeOrgRoleUser: [
          "DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}"
        ],
        setImmutableReleasesSettings: [
          "PUT /orgs/{org}/settings/immutable-releases"
        ],
        setImmutableReleasesSettingsRepositories: [
          "PUT /orgs/{org}/settings/immutable-releases/repositories"
        ],
        setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
        setPublicMembershipForAuthenticatedUser: [
          "PUT /orgs/{org}/public_members/{username}"
        ],
        unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
        update: ["PATCH /orgs/{org}"],
        updateIssueType: ["PUT /orgs/{org}/issue-types/{issue_type_id}"],
        updateMembershipForAuthenticatedUser: [
          "PATCH /user/memberships/orgs/{org}"
        ],
        updatePatAccess: ["POST /orgs/{org}/personal-access-tokens/{pat_id}"],
        updatePatAccesses: ["POST /orgs/{org}/personal-access-tokens"],
        updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
        updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
      },
      packages: {
        deletePackageForAuthenticatedUser: [
          "DELETE /user/packages/{package_type}/{package_name}"
        ],
        deletePackageForOrg: [
          "DELETE /orgs/{org}/packages/{package_type}/{package_name}"
        ],
        deletePackageForUser: [
          "DELETE /users/{username}/packages/{package_type}/{package_name}"
        ],
        deletePackageVersionForAuthenticatedUser: [
          "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        deletePackageVersionForOrg: [
          "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        deletePackageVersionForUser: [
          "DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getAllPackageVersionsForAPackageOwnedByAnOrg: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
          {},
          { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] }
        ],
        getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions",
          {},
          {
            renamed: [
              "packages",
              "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"
            ]
          }
        ],
        getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions"
        ],
        getAllPackageVersionsForPackageOwnedByOrg: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions"
        ],
        getAllPackageVersionsForPackageOwnedByUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}/versions"
        ],
        getPackageForAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}"
        ],
        getPackageForOrganization: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}"
        ],
        getPackageForUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}"
        ],
        getPackageVersionForAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getPackageVersionForOrganization: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getPackageVersionForUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        listDockerMigrationConflictingPackagesForAuthenticatedUser: [
          "GET /user/docker/conflicts"
        ],
        listDockerMigrationConflictingPackagesForOrganization: [
          "GET /orgs/{org}/docker/conflicts"
        ],
        listDockerMigrationConflictingPackagesForUser: [
          "GET /users/{username}/docker/conflicts"
        ],
        listPackagesForAuthenticatedUser: ["GET /user/packages"],
        listPackagesForOrganization: ["GET /orgs/{org}/packages"],
        listPackagesForUser: ["GET /users/{username}/packages"],
        restorePackageForAuthenticatedUser: [
          "POST /user/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageForOrg: [
          "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageForUser: [
          "POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageVersionForAuthenticatedUser: [
          "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ],
        restorePackageVersionForOrg: [
          "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ],
        restorePackageVersionForUser: [
          "POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ]
      },
      privateRegistries: {
        createOrgPrivateRegistry: ["POST /orgs/{org}/private-registries"],
        deleteOrgPrivateRegistry: [
          "DELETE /orgs/{org}/private-registries/{secret_name}"
        ],
        getOrgPrivateRegistry: ["GET /orgs/{org}/private-registries/{secret_name}"],
        getOrgPublicKey: ["GET /orgs/{org}/private-registries/public-key"],
        listOrgPrivateRegistries: ["GET /orgs/{org}/private-registries"],
        updateOrgPrivateRegistry: [
          "PATCH /orgs/{org}/private-registries/{secret_name}"
        ]
      },
      projects: {
        addItemForOrg: ["POST /orgs/{org}/projectsV2/{project_number}/items"],
        addItemForUser: [
          "POST /users/{username}/projectsV2/{project_number}/items"
        ],
        deleteItemForOrg: [
          "DELETE /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
        ],
        deleteItemForUser: [
          "DELETE /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ],
        getFieldForOrg: [
          "GET /orgs/{org}/projectsV2/{project_number}/fields/{field_id}"
        ],
        getFieldForUser: [
          "GET /users/{username}/projectsV2/{project_number}/fields/{field_id}"
        ],
        getForOrg: ["GET /orgs/{org}/projectsV2/{project_number}"],
        getForUser: ["GET /users/{username}/projectsV2/{project_number}"],
        getOrgItem: ["GET /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
        getUserItem: [
          "GET /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ],
        listFieldsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/fields"],
        listFieldsForUser: [
          "GET /users/{username}/projectsV2/{project_number}/fields"
        ],
        listForOrg: ["GET /orgs/{org}/projectsV2"],
        listForUser: ["GET /users/{username}/projectsV2"],
        listItemsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/items"],
        listItemsForUser: [
          "GET /users/{username}/projectsV2/{project_number}/items"
        ],
        updateItemForOrg: [
          "PATCH /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
        ],
        updateItemForUser: [
          "PATCH /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ]
      },
      pulls: {
        checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        create: ["POST /repos/{owner}/{repo}/pulls"],
        createReplyForReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"
        ],
        createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        createReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"
        ],
        deletePendingReview: [
          "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        deleteReviewComment: [
          "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"
        ],
        dismissReview: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"
        ],
        get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
        getReview: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
        list: ["GET /repos/{owner}/{repo}/pulls"],
        listCommentsForReview: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"
        ],
        listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
        listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
        listRequestedReviewers: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        listReviewComments: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"
        ],
        listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
        listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        removeRequestedReviewers: [
          "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        requestReviewers: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        submitReview: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"
        ],
        update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
        updateBranch: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"
        ],
        updateReview: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        updateReviewComment: [
          "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"
        ]
      },
      rateLimit: { get: ["GET /rate_limit"] },
      reactions: {
        createForCommitComment: [
          "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"
        ],
        createForIssue: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"
        ],
        createForIssueComment: [
          "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
        ],
        createForPullRequestReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
        ],
        createForRelease: [
          "POST /repos/{owner}/{repo}/releases/{release_id}/reactions"
        ],
        createForTeamDiscussionCommentInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
        ],
        createForTeamDiscussionInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
        ],
        deleteForCommitComment: [
          "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForIssue: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"
        ],
        deleteForIssueComment: [
          "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForPullRequestComment: [
          "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForRelease: [
          "DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}"
        ],
        deleteForTeamDiscussion: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"
        ],
        deleteForTeamDiscussionComment: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"
        ],
        listForCommitComment: [
          "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"
        ],
        listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
        listForIssueComment: [
          "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
        ],
        listForPullRequestReviewComment: [
          "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
        ],
        listForRelease: [
          "GET /repos/{owner}/{repo}/releases/{release_id}/reactions"
        ],
        listForTeamDiscussionCommentInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
        ],
        listForTeamDiscussionInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
        ]
      },
      repos: {
        acceptInvitation: [
          "PATCH /user/repository_invitations/{invitation_id}",
          {},
          { renamed: ["repos", "acceptInvitationForAuthenticatedUser"] }
        ],
        acceptInvitationForAuthenticatedUser: [
          "PATCH /user/repository_invitations/{invitation_id}"
        ],
        addAppAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
        addStatusCheckContexts: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        addTeamAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        addUserAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        cancelPagesDeployment: [
          "POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel"
        ],
        checkAutomatedSecurityFixes: [
          "GET /repos/{owner}/{repo}/automated-security-fixes"
        ],
        checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
        checkImmutableReleases: ["GET /repos/{owner}/{repo}/immutable-releases"],
        checkPrivateVulnerabilityReporting: [
          "GET /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        checkVulnerabilityAlerts: [
          "GET /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        codeownersErrors: ["GET /repos/{owner}/{repo}/codeowners/errors"],
        compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
        compareCommitsWithBasehead: [
          "GET /repos/{owner}/{repo}/compare/{basehead}"
        ],
        createAttestation: ["POST /repos/{owner}/{repo}/attestations"],
        createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
        createCommitComment: [
          "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"
        ],
        createCommitSignatureProtection: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
        createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
        createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
        createDeploymentBranchPolicy: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
        ],
        createDeploymentProtectionRule: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
        ],
        createDeploymentStatus: [
          "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
        ],
        createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
        createForAuthenticatedUser: ["POST /user/repos"],
        createFork: ["POST /repos/{owner}/{repo}/forks"],
        createInOrg: ["POST /orgs/{org}/repos"],
        createOrUpdateEnvironment: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
        createOrgRuleset: ["POST /orgs/{org}/rulesets"],
        createPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments"],
        createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
        createRelease: ["POST /repos/{owner}/{repo}/releases"],
        createRepoRuleset: ["POST /repos/{owner}/{repo}/rulesets"],
        createUsingTemplate: [
          "POST /repos/{template_owner}/{template_repo}/generate"
        ],
        createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
        customPropertiesForReposCreateOrUpdateRepositoryValues: [
          "PATCH /repos/{owner}/{repo}/properties/values"
        ],
        customPropertiesForReposGetRepositoryValues: [
          "GET /repos/{owner}/{repo}/properties/values"
        ],
        declineInvitation: [
          "DELETE /user/repository_invitations/{invitation_id}",
          {},
          { renamed: ["repos", "declineInvitationForAuthenticatedUser"] }
        ],
        declineInvitationForAuthenticatedUser: [
          "DELETE /user/repository_invitations/{invitation_id}"
        ],
        delete: ["DELETE /repos/{owner}/{repo}"],
        deleteAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
        ],
        deleteAdminBranchProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        deleteAnEnvironment: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
        deleteBranchProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
        deleteCommitSignatureProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
        deleteDeployment: [
          "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"
        ],
        deleteDeploymentBranchPolicy: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
        deleteInvitation: [
          "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"
        ],
        deleteOrgRuleset: ["DELETE /orgs/{org}/rulesets/{ruleset_id}"],
        deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
        deletePullRequestReviewProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
        deleteReleaseAsset: [
          "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"
        ],
        deleteRepoRuleset: ["DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
        disableAutomatedSecurityFixes: [
          "DELETE /repos/{owner}/{repo}/automated-security-fixes"
        ],
        disableDeploymentProtectionRule: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
        ],
        disableImmutableReleases: [
          "DELETE /repos/{owner}/{repo}/immutable-releases"
        ],
        disablePrivateVulnerabilityReporting: [
          "DELETE /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        disableVulnerabilityAlerts: [
          "DELETE /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        downloadArchive: [
          "GET /repos/{owner}/{repo}/zipball/{ref}",
          {},
          { renamed: ["repos", "downloadZipballArchive"] }
        ],
        downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
        downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
        enableAutomatedSecurityFixes: [
          "PUT /repos/{owner}/{repo}/automated-security-fixes"
        ],
        enableImmutableReleases: ["PUT /repos/{owner}/{repo}/immutable-releases"],
        enablePrivateVulnerabilityReporting: [
          "PUT /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        enableVulnerabilityAlerts: [
          "PUT /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        generateReleaseNotes: [
          "POST /repos/{owner}/{repo}/releases/generate-notes"
        ],
        get: ["GET /repos/{owner}/{repo}"],
        getAccessRestrictions: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
        ],
        getAdminBranchProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        getAllDeploymentProtectionRules: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
        ],
        getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
        getAllStatusCheckContexts: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"
        ],
        getAllTopics: ["GET /repos/{owner}/{repo}/topics"],
        getAppsWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"
        ],
        getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
        getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
        getBranchProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        getBranchRules: ["GET /repos/{owner}/{repo}/rules/branches/{branch}"],
        getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
        getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
        getCollaboratorPermissionLevel: [
          "GET /repos/{owner}/{repo}/collaborators/{username}/permission"
        ],
        getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
        getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
        getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
        getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
        getCommitSignatureProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
        getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
        getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
        getCustomDeploymentProtectionRule: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
        ],
        getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
        getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
        getDeploymentBranchPolicy: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        getDeploymentStatus: [
          "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"
        ],
        getEnvironment: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
        getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
        getOrgRuleSuite: ["GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}"],
        getOrgRuleSuites: ["GET /orgs/{org}/rulesets/rule-suites"],
        getOrgRuleset: ["GET /orgs/{org}/rulesets/{ruleset_id}"],
        getOrgRulesets: ["GET /orgs/{org}/rulesets"],
        getPages: ["GET /repos/{owner}/{repo}/pages"],
        getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
        getPagesDeployment: [
          "GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}"
        ],
        getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
        getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
        getPullRequestReviewProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
        getReadme: ["GET /repos/{owner}/{repo}/readme"],
        getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
        getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
        getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
        getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
        getRepoRuleSuite: [
          "GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}"
        ],
        getRepoRuleSuites: ["GET /repos/{owner}/{repo}/rulesets/rule-suites"],
        getRepoRuleset: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        getRepoRulesetHistory: [
          "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history"
        ],
        getRepoRulesetVersion: [
          "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}"
        ],
        getRepoRulesets: ["GET /repos/{owner}/{repo}/rulesets"],
        getStatusChecksProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        getTeamsWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"
        ],
        getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
        getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
        getUsersWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"
        ],
        getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
        getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
        getWebhookConfigForRepo: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/config"
        ],
        getWebhookDelivery: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"
        ],
        listActivities: ["GET /repos/{owner}/{repo}/activity"],
        listAttestations: [
          "GET /repos/{owner}/{repo}/attestations/{subject_digest}"
        ],
        listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
        listBranches: ["GET /repos/{owner}/{repo}/branches"],
        listBranchesForHeadCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"
        ],
        listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
        listCommentsForCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"
        ],
        listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
        listCommitStatusesForRef: [
          "GET /repos/{owner}/{repo}/commits/{ref}/statuses"
        ],
        listCommits: ["GET /repos/{owner}/{repo}/commits"],
        listContributors: ["GET /repos/{owner}/{repo}/contributors"],
        listCustomDeploymentRuleIntegrations: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps"
        ],
        listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
        listDeploymentBranchPolicies: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
        ],
        listDeploymentStatuses: [
          "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
        ],
        listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
        listForAuthenticatedUser: ["GET /user/repos"],
        listForOrg: ["GET /orgs/{org}/repos"],
        listForUser: ["GET /users/{username}/repos"],
        listForks: ["GET /repos/{owner}/{repo}/forks"],
        listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
        listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
        listLanguages: ["GET /repos/{owner}/{repo}/languages"],
        listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
        listPublic: ["GET /repositories"],
        listPullRequestsAssociatedWithCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"
        ],
        listReleaseAssets: [
          "GET /repos/{owner}/{repo}/releases/{release_id}/assets"
        ],
        listReleases: ["GET /repos/{owner}/{repo}/releases"],
        listTags: ["GET /repos/{owner}/{repo}/tags"],
        listTeams: ["GET /repos/{owner}/{repo}/teams"],
        listWebhookDeliveries: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"
        ],
        listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
        merge: ["POST /repos/{owner}/{repo}/merges"],
        mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
        pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
        redeliverWebhookDelivery: [
          "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
        ],
        removeAppAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        removeCollaborator: [
          "DELETE /repos/{owner}/{repo}/collaborators/{username}"
        ],
        removeStatusCheckContexts: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        removeStatusCheckProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        removeTeamAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        removeUserAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
        replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics"],
        requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
        setAdminBranchProtection: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        setAppAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        setStatusCheckContexts: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        setTeamAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        setUserAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
        transfer: ["POST /repos/{owner}/{repo}/transfer"],
        update: ["PATCH /repos/{owner}/{repo}"],
        updateBranchProtection: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
        updateDeploymentBranchPolicy: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
        updateInvitation: [
          "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"
        ],
        updateOrgRuleset: ["PUT /orgs/{org}/rulesets/{ruleset_id}"],
        updatePullRequestReviewProtection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
        updateReleaseAsset: [
          "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"
        ],
        updateRepoRuleset: ["PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        updateStatusCheckPotection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
          {},
          { renamed: ["repos", "updateStatusCheckProtection"] }
        ],
        updateStatusCheckProtection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
        updateWebhookConfigForRepo: [
          "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"
        ],
        uploadReleaseAsset: [
          "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
          { baseUrl: "https://uploads.github.com" }
        ]
      },
      search: {
        code: ["GET /search/code"],
        commits: ["GET /search/commits"],
        issuesAndPullRequests: ["GET /search/issues"],
        labels: ["GET /search/labels"],
        repos: ["GET /search/repositories"],
        topics: ["GET /search/topics"],
        users: ["GET /search/users"]
      },
      secretScanning: {
        createPushProtectionBypass: [
          "POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses"
        ],
        getAlert: [
          "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
        ],
        getScanHistory: ["GET /repos/{owner}/{repo}/secret-scanning/scan-history"],
        listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
        listLocationsForAlert: [
          "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations"
        ],
        listOrgPatternConfigs: [
          "GET /orgs/{org}/secret-scanning/pattern-configurations"
        ],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
        ],
        updateOrgPatternConfigs: [
          "PATCH /orgs/{org}/secret-scanning/pattern-configurations"
        ]
      },
      securityAdvisories: {
        createFork: [
          "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks"
        ],
        createPrivateVulnerabilityReport: [
          "POST /repos/{owner}/{repo}/security-advisories/reports"
        ],
        createRepositoryAdvisory: [
          "POST /repos/{owner}/{repo}/security-advisories"
        ],
        createRepositoryAdvisoryCveRequest: [
          "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve"
        ],
        getGlobalAdvisory: ["GET /advisories/{ghsa_id}"],
        getRepositoryAdvisory: [
          "GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
        ],
        listGlobalAdvisories: ["GET /advisories"],
        listOrgRepositoryAdvisories: ["GET /orgs/{org}/security-advisories"],
        listRepositoryAdvisories: ["GET /repos/{owner}/{repo}/security-advisories"],
        updateRepositoryAdvisory: [
          "PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
        ]
      },
      teams: {
        addOrUpdateMembershipForUserInOrg: [
          "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        addOrUpdateRepoPermissionsInOrg: [
          "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        checkPermissionsForRepoInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        create: ["POST /orgs/{org}/teams"],
        createDiscussionCommentInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
        ],
        createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
        deleteDiscussionCommentInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        deleteDiscussionInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
        getByName: ["GET /orgs/{org}/teams/{team_slug}"],
        getDiscussionCommentInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        getDiscussionInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        getMembershipForUserInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        list: ["GET /orgs/{org}/teams"],
        listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
        listDiscussionCommentsInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
        ],
        listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
        listForAuthenticatedUser: ["GET /user/teams"],
        listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
        listPendingInvitationsInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/invitations"
        ],
        listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
        removeMembershipForUserInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        removeRepoInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        updateDiscussionCommentInOrg: [
          "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        updateDiscussionInOrg: [
          "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
      },
      users: {
        addEmailForAuthenticated: [
          "POST /user/emails",
          {},
          { renamed: ["users", "addEmailForAuthenticatedUser"] }
        ],
        addEmailForAuthenticatedUser: ["POST /user/emails"],
        addSocialAccountForAuthenticatedUser: ["POST /user/social_accounts"],
        block: ["PUT /user/blocks/{username}"],
        checkBlocked: ["GET /user/blocks/{username}"],
        checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
        checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
        createGpgKeyForAuthenticated: [
          "POST /user/gpg_keys",
          {},
          { renamed: ["users", "createGpgKeyForAuthenticatedUser"] }
        ],
        createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
        createPublicSshKeyForAuthenticated: [
          "POST /user/keys",
          {},
          { renamed: ["users", "createPublicSshKeyForAuthenticatedUser"] }
        ],
        createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
        createSshSigningKeyForAuthenticatedUser: ["POST /user/ssh_signing_keys"],
        deleteAttestationsBulk: [
          "POST /users/{username}/attestations/delete-request"
        ],
        deleteAttestationsById: [
          "DELETE /users/{username}/attestations/{attestation_id}"
        ],
        deleteAttestationsBySubjectDigest: [
          "DELETE /users/{username}/attestations/digest/{subject_digest}"
        ],
        deleteEmailForAuthenticated: [
          "DELETE /user/emails",
          {},
          { renamed: ["users", "deleteEmailForAuthenticatedUser"] }
        ],
        deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
        deleteGpgKeyForAuthenticated: [
          "DELETE /user/gpg_keys/{gpg_key_id}",
          {},
          { renamed: ["users", "deleteGpgKeyForAuthenticatedUser"] }
        ],
        deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
        deletePublicSshKeyForAuthenticated: [
          "DELETE /user/keys/{key_id}",
          {},
          { renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"] }
        ],
        deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
        deleteSocialAccountForAuthenticatedUser: ["DELETE /user/social_accounts"],
        deleteSshSigningKeyForAuthenticatedUser: [
          "DELETE /user/ssh_signing_keys/{ssh_signing_key_id}"
        ],
        follow: ["PUT /user/following/{username}"],
        getAuthenticated: ["GET /user"],
        getById: ["GET /user/{account_id}"],
        getByUsername: ["GET /users/{username}"],
        getContextForUser: ["GET /users/{username}/hovercard"],
        getGpgKeyForAuthenticated: [
          "GET /user/gpg_keys/{gpg_key_id}",
          {},
          { renamed: ["users", "getGpgKeyForAuthenticatedUser"] }
        ],
        getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
        getPublicSshKeyForAuthenticated: [
          "GET /user/keys/{key_id}",
          {},
          { renamed: ["users", "getPublicSshKeyForAuthenticatedUser"] }
        ],
        getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
        getSshSigningKeyForAuthenticatedUser: [
          "GET /user/ssh_signing_keys/{ssh_signing_key_id}"
        ],
        list: ["GET /users"],
        listAttestations: ["GET /users/{username}/attestations/{subject_digest}"],
        listAttestationsBulk: [
          "POST /users/{username}/attestations/bulk-list{?per_page,before,after}"
        ],
        listBlockedByAuthenticated: [
          "GET /user/blocks",
          {},
          { renamed: ["users", "listBlockedByAuthenticatedUser"] }
        ],
        listBlockedByAuthenticatedUser: ["GET /user/blocks"],
        listEmailsForAuthenticated: [
          "GET /user/emails",
          {},
          { renamed: ["users", "listEmailsForAuthenticatedUser"] }
        ],
        listEmailsForAuthenticatedUser: ["GET /user/emails"],
        listFollowedByAuthenticated: [
          "GET /user/following",
          {},
          { renamed: ["users", "listFollowedByAuthenticatedUser"] }
        ],
        listFollowedByAuthenticatedUser: ["GET /user/following"],
        listFollowersForAuthenticatedUser: ["GET /user/followers"],
        listFollowersForUser: ["GET /users/{username}/followers"],
        listFollowingForUser: ["GET /users/{username}/following"],
        listGpgKeysForAuthenticated: [
          "GET /user/gpg_keys",
          {},
          { renamed: ["users", "listGpgKeysForAuthenticatedUser"] }
        ],
        listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
        listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
        listPublicEmailsForAuthenticated: [
          "GET /user/public_emails",
          {},
          { renamed: ["users", "listPublicEmailsForAuthenticatedUser"] }
        ],
        listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
        listPublicKeysForUser: ["GET /users/{username}/keys"],
        listPublicSshKeysForAuthenticated: [
          "GET /user/keys",
          {},
          { renamed: ["users", "listPublicSshKeysForAuthenticatedUser"] }
        ],
        listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
        listSocialAccountsForAuthenticatedUser: ["GET /user/social_accounts"],
        listSocialAccountsForUser: ["GET /users/{username}/social_accounts"],
        listSshSigningKeysForAuthenticatedUser: ["GET /user/ssh_signing_keys"],
        listSshSigningKeysForUser: ["GET /users/{username}/ssh_signing_keys"],
        setPrimaryEmailVisibilityForAuthenticated: [
          "PATCH /user/email/visibility",
          {},
          { renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"] }
        ],
        setPrimaryEmailVisibilityForAuthenticatedUser: [
          "PATCH /user/email/visibility"
        ],
        unblock: ["DELETE /user/blocks/{username}"],
        unfollow: ["DELETE /user/following/{username}"],
        updateAuthenticated: ["PATCH /user"]
      }
    };
    endpoints_default = Endpoints;
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js
function endpointsToMethods(octokit) {
  const newMethods = {};
  for (const scope of endpointMethodsMap.keys()) {
    newMethods[scope] = new Proxy({ octokit, scope, cache: {} }, handler);
  }
  return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
  const requestWithDefaults = octokit.request.defaults(defaults);
  function withDecorations(...args) {
    let options = requestWithDefaults.endpoint.merge(...args);
    if (decorations.mapToData) {
      options = Object.assign({}, options, {
        data: options[decorations.mapToData],
        [decorations.mapToData]: void 0
      });
      return requestWithDefaults(options);
    }
    if (decorations.renamed) {
      const [newScope, newMethodName] = decorations.renamed;
      octokit.log.warn(
        `octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`
      );
    }
    if (decorations.deprecated) {
      octokit.log.warn(decorations.deprecated);
    }
    if (decorations.renamedParameters) {
      const options2 = requestWithDefaults.endpoint.merge(...args);
      for (const [name, alias] of Object.entries(
        decorations.renamedParameters
      )) {
        if (name in options2) {
          octokit.log.warn(
            `"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`
          );
          if (!(alias in options2)) {
            options2[alias] = options2[name];
          }
          delete options2[name];
        }
      }
      return requestWithDefaults(options2);
    }
    return requestWithDefaults(...args);
  }
  return Object.assign(withDecorations, requestWithDefaults);
}
var endpointMethodsMap, handler;
var init_endpoints_to_methods = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js"() {
    init_endpoints();
    endpointMethodsMap = /* @__PURE__ */ new Map();
    for (const [scope, endpoints] of Object.entries(endpoints_default)) {
      for (const [methodName, endpoint2] of Object.entries(endpoints)) {
        const [route, defaults, decorations] = endpoint2;
        const [method, url] = route.split(/ /);
        const endpointDefaults = Object.assign(
          {
            method,
            url
          },
          defaults
        );
        if (!endpointMethodsMap.has(scope)) {
          endpointMethodsMap.set(scope, /* @__PURE__ */ new Map());
        }
        endpointMethodsMap.get(scope).set(methodName, {
          scope,
          methodName,
          endpointDefaults,
          decorations
        });
      }
    }
    handler = {
      has({ scope }, methodName) {
        return endpointMethodsMap.get(scope).has(methodName);
      },
      getOwnPropertyDescriptor(target, methodName) {
        return {
          value: this.get(target, methodName),
          // ensures method is in the cache
          configurable: true,
          writable: true,
          enumerable: true
        };
      },
      defineProperty(target, methodName, descriptor) {
        Object.defineProperty(target.cache, methodName, descriptor);
        return true;
      },
      deleteProperty(target, methodName) {
        delete target.cache[methodName];
        return true;
      },
      ownKeys({ scope }) {
        return [...endpointMethodsMap.get(scope).keys()];
      },
      set(target, methodName, value) {
        return target.cache[methodName] = value;
      },
      get({ octokit, scope, cache }, methodName) {
        if (cache[methodName]) {
          return cache[methodName];
        }
        const method = endpointMethodsMap.get(scope).get(methodName);
        if (!method) {
          return void 0;
        }
        const { endpointDefaults, decorations } = method;
        if (decorations) {
          cache[methodName] = decorate(
            octokit,
            scope,
            methodName,
            endpointDefaults,
            decorations
          );
        } else {
          cache[methodName] = octokit.request.defaults(endpointDefaults);
        }
        return cache[methodName];
      }
    };
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js
function restEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    rest: api
  };
}
function legacyRestEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    ...api,
    rest: api
  };
}
var init_dist_src4 = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js"() {
    init_version3();
    init_endpoints_to_methods();
    restEndpointMethods.VERSION = VERSION7;
    legacyRestEndpointMethods.VERSION = VERSION7;
  }
});

// node_modules/@octokit/rest/dist-src/version.js
var VERSION8;
var init_version4 = __esm({
  "node_modules/@octokit/rest/dist-src/version.js"() {
    VERSION8 = "22.0.1";
  }
});

// node_modules/@octokit/rest/dist-src/index.js
var dist_src_exports = {};
__export(dist_src_exports, {
  Octokit: () => Octokit2
});
var Octokit2;
var init_dist_src5 = __esm({
  "node_modules/@octokit/rest/dist-src/index.js"() {
    init_dist_src2();
    init_dist_src3();
    init_dist_bundle5();
    init_dist_src4();
    init_version4();
    Octokit2 = Octokit.plugin(requestLog, legacyRestEndpointMethods, paginateRest).defaults(
      {
        userAgent: `octokit-rest.js/${VERSION8}`
      }
    );
  }
});

// src/github/languageVersionFetcher.ts
var LANGUAGE_RELEASE_REPOS = /* @__PURE__ */ new Map([
  ["ruby", "ruby/ruby"],
  ["node", "nodejs/node"],
  ["python", "python/cpython"]
]);
var STABLE_TAG_RE = /^v?\d+\.\d+[._]\d+$/;
async function fetchLatestLanguageVersions(client) {
  const entries = await Promise.all(
    [...LANGUAGE_RELEASE_REPOS].map(async ([lang, repo]) => {
      const tag = await fetchLatestReleaseTag(client, repo);
      return [lang, parseTagToVersion(tag)];
    })
  );
  return new Map(entries);
}
function splitRepo(fullName) {
  const [owner = "", repo = ""] = fullName.split("/");
  return { owner, repo };
}
async function fetchLatestReleaseTag(client, repoFullName) {
  const { owner, repo } = splitRepo(repoFullName);
  try {
    const { data: release } = await client.rest.repos.getLatestRelease({ owner, repo });
    return release.tag_name;
  } catch {
    const { data: tags } = await client.rest.repos.listTags({ owner, repo });
    const stable = tags.find((t) => STABLE_TAG_RE.test(t.name));
    if (!stable) throw new Error(`No stable release found for ${repoFullName}`);
    return stable.name;
  }
}
function parseTagToVersion(tag) {
  const parts = tag.replace(/^v/, "").replace(/_/g, ".").split(".", 3);
  return [Number(parts[0]), Number(parts[1] ?? 0)];
}

// src/github/repositoryFetcher.ts
init_dist_src();

// src/github/workflowParser.ts
init_dist_src();

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator2, options) {
  if (iterator2 !== null && typeof iterator2 === "object" && typeof options === "undefined") {
    options = iterator2;
    iterator2 = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator2 !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator2(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = (function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  })();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = (function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  })();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var CORE_SCHEMA = core;
var DEFAULT_SCHEMA = _default;
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var YAMLException = exception;
var types = {
  binary,
  float,
  map,
  null: _null,
  pairs,
  set,
  timestamp,
  bool,
  int,
  merge,
  omap,
  seq,
  str
};
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");
var jsYaml = {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
};

// src/github/workflowParser.ts
var LANGUAGE_KEYS = {
  "ruby-version": "ruby",
  "node-version": "node",
  "python-version": "python"
};
var MATRIX_REF_PATTERN = /^\$\{\{\s*matrix\.([\w-]+)\s*\}\}$/;
async function analyzeWorkflows(client, repoFullName) {
  const files = await fetchWorkflowFiles(client, repoFullName);
  return analyzeWorkflowFiles(files);
}
function analyzeWorkflowFiles(files) {
  return {
    languageVersions: extractAllLanguageVersions(files),
    noActionlint: files.length > 0 && files.every((f) => !/\bactionlint\b/.test(f))
  };
}
async function fetchWorkflowFiles(client, repoFullName) {
  try {
    const [owner, repo] = repoFullName.split("/");
    const { data: entries } = await client.rest.repos.getContent({
      owner,
      repo,
      path: ".github/workflows"
    });
    if (!Array.isArray(entries)) {
      return [];
    }
    const results = [];
    for (const entry of entries) {
      if (!entry.name.endsWith(".yml") && !entry.name.endsWith(".yaml")) {
        continue;
      }
      const { data: file } = await client.rest.repos.getContent({
        owner,
        repo,
        path: entry.path
      });
      if (!Array.isArray(file) && "content" in file && file.content) {
        results.push(Buffer.from(file.content, "base64").toString("utf-8"));
      }
    }
    return results;
  } catch (error) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return [];
    }
    throw error;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function extractAllLanguageVersions(files) {
  const versions = {};
  for (const content of files) {
    for (const [lang, vals] of Object.entries(extractFromWorkflow(content))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  for (const key of Object.keys(versions)) {
    versions[key] = [...new Set(versions[key])];
  }
  return versions;
}
function extractFromWorkflow(content) {
  const workflow = parseYaml(content);
  if (!isRecord(workflow)) return {};
  const jobs = workflow.jobs;
  if (!isRecord(jobs)) return {};
  const versions = {};
  for (const job of Object.values(jobs)) {
    if (!isRecord(job)) continue;
    const matrix = extractMatrix(job);
    for (const [lang, vals] of Object.entries(extractFromSteps(job.steps, matrix))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  return versions;
}
function parseYaml(content) {
  try {
    return jsYaml.load(content);
  } catch {
    return null;
  }
}
function extractMatrix(job) {
  const strategy = job.strategy;
  if (!isRecord(strategy)) return {};
  const matrix = strategy.matrix;
  if (!isRecord(matrix)) return {};
  const result = {};
  for (const [key, values] of Object.entries(matrix)) {
    if (!Array.isArray(values)) continue;
    result[key] = values.map((v) => String(v));
  }
  return result;
}
function extractFromSteps(steps, matrix) {
  if (!Array.isArray(steps)) return {};
  const versions = {};
  for (const step of steps) {
    for (const [lang, vals] of Object.entries(extractFromStep(step, matrix))) {
      versions[lang] = (versions[lang] ?? []).concat(vals);
    }
  }
  return versions;
}
function extractFromStep(step, matrix) {
  if (!isRecord(step)) return {};
  const withObj = step.with;
  if (!isRecord(withObj)) return {};
  const versions = {};
  for (const [langKey, langName] of Object.entries(LANGUAGE_KEYS)) {
    const value = withObj[langKey];
    if (value === void 0 || value === null) continue;
    versions[langName] = resolveValue(String(value), langKey, matrix);
  }
  return versions;
}
function resolveValue(value, langKey, matrix) {
  const match = MATRIX_REF_PATTERN.exec(value);
  if (match) {
    const matrixKey = match[1] || langKey;
    return matrix[matrixKey] || [];
  }
  return [value];
}

// src/github/repositoryFetcher.ts
var ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1e3;
function isActiveRepo(repo) {
  return !repo.archived && !repo.fork && new Date(repo.pushed_at ?? 0).getTime() > Date.now() - ONE_YEAR_MS;
}
async function fetchRepositories(client, { debug: debug2 = false } = {}) {
  const login = await getLogin(client);
  const allRepos = await client.paginate(client.rest.repos.listForAuthenticatedUser, { type: "owner" });
  if (debug2) console.warn(`[debug] Found ${allRepos.length} repositories`);
  const activeRepos = allRepos.filter(isActiveRepo);
  if (debug2) console.warn(`[debug] ${activeRepos.length} repositories after filtering`);
  return Promise.all(
    activeRepos.map((repo, i) => {
      if (debug2) console.warn(`[debug] Processing ${repo.name} (${i + 1}/${activeRepos.length})`);
      return buildRepository(client, login, repo);
    })
  );
}
async function getLogin(client) {
  const { data: user } = await client.rest.users.getAuthenticated();
  return user.login;
}
async function buildRepository(client, login, repo) {
  const [prCount, workflows] = await Promise.all([
    fetchPullRequestCount(client, login, repo.name),
    analyzeWorkflows(client, `${login}/${repo.name}`)
  ]);
  return {
    name: repo.name,
    url: repo.html_url,
    pullRequestsCount: prCount,
    languageVersions: workflows.languageVersions,
    noActionlint: workflows.noActionlint
  };
}
async function fetchPullRequestCount(client, owner, repo) {
  try {
    const pulls = await client.rest.pulls.list({ owner, repo, state: "open" });
    return pulls.data.length;
  } catch (error) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      return 0;
    }
    throw error;
  }
}

// src/ghscan/main.ts
async function run({ debug: debug2 = false } = {}) {
  const token = requireToken();
  const { Octokit: Octokit3 } = await Promise.resolve().then(() => (init_dist_src5(), dist_src_exports));
  const client = new Octokit3({ auth: token });
  const [repositories, latestVersions] = await Promise.all([
    fetchRepositories(client, { debug: debug2 }),
    fetchLatestLanguageVersions(client)
  ]);
  const filtered = filterRepositories(repositories, latestVersions);
  console.log(JSON.stringify(filtered));
}
function requireToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Error: GITHUB_TOKEN environment variable is not set");
    process.exit(1);
  }
  return token;
}
function filterRepositories(repositories, latestVersions) {
  return repositories.filter(
    (repo) => repo.pullRequestsCount >= 1 || hasOutdatedLanguageVersion(repo, latestVersions) || repo.noActionlint
  );
}
function hasOutdatedLanguageVersion(repo, latestVersions) {
  return Object.entries(repo.languageVersions).some(([lang, versions]) => {
    const latest = latestVersions.get(lang);
    if (!latest) return false;
    return versions.every((v) => compareVersions(parseMinorVersion(v), latest) < 0);
  });
}
function parseMinorVersion(versionString) {
  const [majorStr, minorStr] = versionString.split(".");
  const minor = minorStr === void 0 || minorStr === "x" ? 99 : Number(minorStr);
  return [Number(majorStr), minor];
}
function compareVersions(a, b) {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

// src/cli.ts
var debug = process.argv.includes("--debug");
run({ debug }).catch((error) => {
  console.error(error);
  process.exit(1);
});
/*! Bundled license information:

@octokit/request-error/dist-src/index.js:
  (* v8 ignore else -- @preserve -- Bug with vitest coverage where it sees an else branch that doesn't exist *)

@octokit/request/dist-bundle/index.js:
  (* v8 ignore next -- @preserve *)
  (* v8 ignore else -- @preserve *)

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
