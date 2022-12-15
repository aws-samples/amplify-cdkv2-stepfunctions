import * as cdk from "aws-cdk-lib";
import * as AmplifyHelpers from "@aws-amplify/cli-extensibility-helper";
import { AmplifyDependentResourcesAttributes } from "../../types/amplify-dependent-resources-ref";
import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";

export class cdkStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps,
    amplifyResourceProps?: AmplifyHelpers.AmplifyResourceProps
  ) {
    super(scope, id, props);
    /* Do not remove - Amplify CLI automatically injects the current deployment environment in this input parameter */
    new cdk.CfnParameter(this, "env", {
      type: "String",
      description: "Current Amplify CLI env name",
    });

    // Access other Amplify Resources

    const retVal: AmplifyDependentResourcesAttributes =
      AmplifyHelpers.addResourceDependency(
        this,
        amplifyResourceProps.category,
        amplifyResourceProps.resourceName,
        [
          { category: "function", resourceName: "stepfunctionsb69c7ccf" },
          { category: "function", resourceName: "stepfunctions1124ff6c" },
          { category: "function", resourceName: "filters3keys" },
          { category: "function", resourceName: "syncS3Buckets" },
        ]
      );

    const myFunctionArn = cdk.Fn.ref(retVal.function.filters3keys.Arn);
    const importedLambda = lambda.Function.fromFunctionArn(
      this,
      "importedLambdasync",
      myFunctionArn
    );

    const importlambdaS3iArn = cdk.Fn.ref(
      retVal.function.stepfunctionsb69c7ccf.Arn
    );
    const importlambdaS3i = lambda.Function.fromFunctionArn(
      this,
      "readkeys1",
      importlambdaS3iArn
    );

    const importlambdaS3iiArn = cdk.Fn.ref(
      retVal.function.stepfunctions1124ff6c.Arn
    );
    const importlambdaS3ii = lambda.Function.fromFunctionArn(
      this,
      "readkeys2",
      importlambdaS3iiArn
    );

    const importlambdaS3syncArn = cdk.Fn.ref(retVal.function.syncS3Buckets.Arn);
    const importlambdaS3sync = lambda.Function.fromFunctionArn(
      this,
      "S3sync",
      importlambdaS3syncArn
    );

    const comparekeys = new tasks.LambdaInvoke(this, "MyLambdaTask", {
      lambdaFunction: importedLambda,
      payloadResponseOnly: true,
    });

    const getkeystask1 = new tasks.LambdaInvoke(this, "Mys3keys1", {
      lambdaFunction: importlambdaS3i,
      payloadResponseOnly: true,
    });

    const getkeystask2 = new tasks.LambdaInvoke(this, "Mys3keys2", {
      lambdaFunction: importlambdaS3ii,
      payloadResponseOnly: true,
    });

    const s3synctask = new tasks.LambdaInvoke(this, "Mys3sync", {
      lambdaFunction: importlambdaS3sync,
      payloadResponseOnly: true,
    }).next(new sfn.Succeed(this, "Done"));

    const serviceRole = new iam.Role(this, "Role", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const definition = new sfn.Parallel(this, "ParallelTask", {})
      .branch(getkeystask1)
      .branch(getkeystask2)
      .next(comparekeys)
      .next(s3synctask);

    const stateMachine = new sfn.StateMachine(this, "TestStateMachine1", {
      definition: definition,
      role: serviceRole,
    });
  }
}
