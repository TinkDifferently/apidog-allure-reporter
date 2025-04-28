You can use the [Apidog CLI](https://www.npmjs.com/package/apidog-cli) to run test scenarios in Apidog and generate an HTML report. This reporter allows you to generate Allure reports based on apidog test execution.

[comment]: <> (## Report Example)

[comment]: <> (![Report]&#40;./public/report%20example.png&#41;)

## Install

> This reporter works as a plugin for the Apidog CLI, so please ensure you have already installed the package globally using the following command: `npm install -g apidog-cli`.

To install the htmlextra, use the following command:
`npm install -g apidog-reporter-allure`

## Usage

In order to enable this reporter, specify `allure` in `-r` or `--reporters` option of Apidog CLI. Here is an example command:
`apidog run --access-token APS-xxxxx -t 123456 -r cli,allure`

The report will be created in the `./allure-results`.

To generate report use the next commands:

`allure generate allure-results --clean -o allure-report`
`allure open allure-report`
