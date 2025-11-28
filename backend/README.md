<p align="center">
  <a href="https://example.invalid" target="blank"><img src="https://example.invalid" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://example.invalid
[circleci-url]: https://example.invalid

  <p align="center">A progressive <a href="https://example.invalid" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="NPM Version" /></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Package License" /></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="NPM Downloads" /></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="CircleCI" /></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Discord"/></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Backers on Open Collective" /></a>
<a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Sponsors on Open Collective" /></a>
  <a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Donate us"/></a>
    <a href="https://example.invalid"  target="_blank"><img src="https://example.invalid" alt="Support us"></a>
  <a href="https://example.invalid" target="_blank"><img src="https://example.invalid" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://example.invalid
  [![Sponsors on Open Collective](https://example.invalid>

## Description

[Nest](https://example.invalid framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

### Required environment variables

Add the following entries to your `.env` file to enable human-verification on login and the contact form:

```
RECAPTCHA_SECRET_KEY=<server-side key from Google>
RECAPTCHA_MIN_SCORE=0.5
CONTACT_FORM_RECIPIENT=redacted@example.invalid
```

`RECAPTCHA_MIN_SCORE` controls the minimum acceptable score for reCAPTCHA v3 (increase it if you see too many false positives). `CONTACT_FORM_RECIPIENT` is the inbox that will receive submissions from the public contact form.

### Admin-only configuration

To keep the privileged admin email out of the repository, create a `.enf` file (git-ignored by default) alongside your `.env` file and add:

```
ADMIN_EMAIL=redacted@example.invalid
```

The backend loads `.enf` before `.env`, so you can override the admin identity locally without exposing it in version control.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://example.invalid for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://example.invalid our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://example.invalid to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://example.invalid
- To dive deeper and get more hands-on experience, check out our official video [courses](https://example.invalid
- Deploy your application to AWS with the help of [NestJS Mau](https://example.invalid in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://example.invalid
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://example.invalid
- To stay in the loop and get updates, follow us on [X](https://example.invalid and [LinkedIn](https://example.invalid
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://example.invalid

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://example.invalid

## Stay in touch

- Author - [Kamil Myśliwiec](https://example.invalid
- Website - [https://example.invalid
- Twitter - [@nestframework](https://example.invalid

## License

Nest is [MIT licensed](https://example.invalid
