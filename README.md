# collector-counter

> **Collect metrics from a counter incremented by you.**  
> A [`telemetry`](https://github.com/telemetry-js/telemetry) plugin.

[![npm status](http://img.shields.io/npm/v/telemetry-js/collector-counter.svg)](https://www.npmjs.org/package/@telemetry-js/collector-counter)
[![node](https://img.shields.io/node/v/@telemetry-js/collector-counter.svg)](https://www.npmjs.org/package/@telemetry-js/collector-counter)
[![Test](https://github.com/telemetry-js/collector-counter/workflows/Test/badge.svg?branch=main)](https://github.com/telemetry-js/collector-counter/actions)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Table of Contents

<details><summary>Click to expand</summary>

- [Usage](#usage)
- [API](#api)
  - [`plugin = counter.delta(metricName, options)`](#plugin--counterdeltametricname-options)
  - [`plugin = counter.persistent(metricName, options)`](#plugin--counterpersistentmetricname-options)
  - [`plugin = counter.rate(metricName, options)`](#plugin--counterratemetricname-options)
  - [`plugin`](#plugin)
  - [`plugin.increment(n)`](#pluginincrementn)
  - [`plugin.decrement(n)`](#plugindecrementn)
- [Install](#install)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Usage

Has three variants: `delta`, `persistent` and `rate`.

```js
const telemetry = require('@telemetry-js/telemetry')()
const counter = require('@telemetry-js/collector-counter')

const errors = counter.delta('myapp.errors.delta')

telemetry.task()
  .collect(errors)
  .publish(..)

// Elsewhere in your app
errors.increment(1)
```

The **`.delta`** function creates a metric of which the value resets to 0 after it's been collected. I.e. its value is a delta between submissions. For this type of metric, the only relevant statistic is `sum`.

If you don't want the value to be reset, which is useful to describe some "current state", use **`.persistent`**:

```js
const connections = counter.persistent('myapp.connections.count')

telemetry.task()
  .collect(connections)
  .publish(..)

// Elsewhere in your app
connections.increment(1)
connections.decrement(1)
```

Lastly, use **`.rate`** for rate metrics. It behaves like `.delta` in that the value is reset to 0 after it's been collected, but the relevant statistic is `average`. In addition, `.rate` will divide your value by the number of elapsed seconds. To explain how this works, let's add a schedule to our example:

```js
const simple = require('@telemetry-js/schedule-simple')
const requests = counter.rate('myapp.requests.per.second')

telemetry.task()
  .collect(requests)
  .schedule(simple, { interval: '5m' })
  .publish(..)

// Elsewhere in your app
requests.increment(1)
```

This schedule will ping our plugin every 5 minutes. Say we have incremented `requests` a 1000 times within 5 minutes. Then the plugin will emit a metric with value `1000 / (5 * 60)`: `3.3` requests per second. To get reliable data, the schedule interval should be greater than 1 second (at least).

If we want to account for spikes and valleys within the 5 minute window, we can either increase the interval (which also affects how often the metric is published) or use the `summarize` processor:

```js
const summarize = require('@telemetry-js/processor-summarize')

telemetry.task()
  .collect(requests)
  .schedule(simple, { interval: '30s' })
  .process(summarize, { window: '5m' })
  .publish(..)
```

This will collect our metric every 30 seconds and publish it every 5 minutes with (among other things) a `min` and `max` of collected values.

## API

### `plugin = counter.delta(metricName, options)`

It is recommended to end the metric name with `.delta`, to differentiate it from other types.

Options:

- `unit`: string, defaults to `count`
- `statistic`: string, defaults to `sum`
- Other options are passed as-is to `telemetry-metric`.

Metrics created by `.delta` get a `.statistic = 'sum'` property. Using this information, the `telemetry-publisher-appoptics` plugin will set the `summarize_function` parameter for you, which tells AppOptics to sum (rather than average) values when rolling up high-resolution measurements. No such behavior exists in CloudWatch and by extension the `telemetry-publisher-cloudwatch` plugin.

### `plugin = counter.persistent(metricName, options)`

It is recommended to end the metric name with the unit, e.g. `connections.count`, `size.bytes`.

Options:

- `unit`: string, defaults to `count`
- `statistic`: string, defaults to `average`
- Other options are passed as-is to `telemetry-metric`.

### `plugin = counter.rate(metricName, options)`

It is recommended to end the metric name with the rate and/or unit, e.g. `requests.per.second` for a unit of `count/second`, `received.kbps` for a unit of `kilobytes/second`.

Options:

- `unit`: string, defaults to `count/second`
- `statistic`: string, defaults to `average`
- Other options are passed as-is to `telemetry-metric`.

### `plugin`

This is a function to be passed to a Telemetry Task. Can be used by multiple tasks, sharing state:

```js
telemetry.task().collect(plugin)
telemetry.task().collect(plugin)
```

### `plugin.increment(n)`

Increment state value by `n`, defaults to 1.

### `plugin.decrement(n)`

Decrement state value by `n`, defaults to 1.

## Install

With [npm](https://npmjs.org) do:

```
npm install @telemetry-js/collector-counter
```

## Acknowledgements

This project is kindly sponsored by [Reason Cybersecurity Inc](https://reasonsecurity.com).

[![reason logo](https://cdn.reasonsecurity.com/github-assets/reason_signature_logo.png)](https://reasonsecurity.com)

## License

[MIT](LICENSE) © Vincent Weevers
