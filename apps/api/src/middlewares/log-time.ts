import { Service } from "typedi";
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";
import { Context } from "..";

@Service()
export class LogTimeMiddleware implements MiddlewareInterface<Context> {
  async use(resolverData: ResolverData<Context>, next: NextFn) {
    const { context, info } = resolverData;
    console.time(`Duration: ${context.userEmail} -> ${info.parentType.name}.${info.fieldName}`);
    const result = await next();
    console.timeEnd(`Duration: ${context.userEmail} -> ${info.parentType.name}.${info.fieldName}`);
    return result;
  }
}
