import { Service } from "typedi";
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";
import { Context } from "..";
import { performance } from "perf_hooks";

@Service()
export class LogTimeMiddleware implements MiddlewareInterface<Context> {
  async use(resolverData: ResolverData<Context>, next: NextFn) {
    const { context, info } = resolverData;
    const now = performance.now();
    const result = await next();
    const duration = performance.now() - now;
    console.log(`Duration: ${context.CustomerId} -> ${info.parentType.name}.${info.fieldName}: ${duration}ms`);
    return result;
  }
}
