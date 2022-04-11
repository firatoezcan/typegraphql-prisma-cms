import { Service } from "typedi";
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";
import { Context } from "..";

@Service()
export class LogAccessMiddleware implements MiddlewareInterface<Context> {
  async use(resolverData: ResolverData<Context>, next: NextFn) {
    const { context, info } = resolverData;
    console.log(`Logging access: ${context.userEmail} -> ${info.parentType.name}.${info.fieldName}`);
    return next();
  }
}
