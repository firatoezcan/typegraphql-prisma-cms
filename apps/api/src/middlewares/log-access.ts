import { Service } from "typedi";
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";
import { Context } from "..";

@Service()
export class LogAccessMiddleware implements MiddlewareInterface<Context> {
  async use({ context, info }: ResolverData<Context>, next: NextFn) {
    console.log(`Logging access: ${context.userEmail} -> ${info.parentType.name}.${info.fieldName}`);
    return next();
  }
}
