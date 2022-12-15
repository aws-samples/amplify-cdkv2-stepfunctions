# Using StepFunction generated through Amplify and AWS CDK V2 to Sync S3 Buckets

Amazon Simple Storage Service (Amazon S3) is an object storage service that allow customers to store files of various types and sizes. Amplify generated storage utilizes the S3 functionality to create a S3 storage bucket. But amplify currently only allows users to create one S3 bucket per environment. Which opens up the question of synchronizing data across Amazon S3 buckets (https://aws.amazon.com/s3/) in different environments, allow creating backups for disaster recovery.

AWS Amplify (https://aws.amazon.com/amplify/) is the fastest and easiest way to build cloud-powered mobile and web apps on AWS. Amplify comprises a set of tools and services that enables front-end web and mobile developers to leverage the power of AWS services to build innovative and feature-rich applications. Among the various resources available Amplify allows users to deploy custom resources using CDK and manage S3 storage bucket.

## Walkthrough

The example utilizes Amplify, AWS CDK v2, storage with Amazon S3, and Lambda function functionality to deploy a StepFunction that syncs S3 buckets. The following example outlines a use case to copy all objects from a source bucket into a destination bucket (two way), but leave out objects that are already present.

The following information outlines the steps needed in creating the application.

1. Create an Amplify project
2. Adding an S3 storage resources via Amplify and AWS console.
3. Adding Lambda functions to access S3 storage.
4. Adding CDK stepfunction resource using Amplify custom resource.
5. Test the application on AWS console.

## Prerequisites

For this walkthrough, you should have the following installed:

- [AWS account](https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fportal.aws.amazon.com%2Fbilling%2Fsignup%2Fresume&client_id=signup)
- [npm](https://www.npmjs.com/)
- [Node.js](https://nodejs.org/en/download/)

### Create an Amplify project

Let's create an Amplify project

```
mkdir s3SyncStepFunction
cd s3SyncStepFunction
```

Next, we will install the Amplify CLI

```
npm install -g @aws-amplify/cli@beta
```

Let’s initialize the application with Amplify CLI

```
amplify init
```

Select the prompts.

```
? Enter a name for the project: s3SyncStepFunction
The following configuration will be applied:

Project information
| Name: s3SyncStepFunction
| Environment: dev
| Default editor: Visual Studio Code
| App type: javascript
| Javascript framework: none
| Source Directory Path: src
| Distribution Directory Path: build
| Build Command: npm.cmd run-script build
| Start Command: npm.cmd run-script start

? Initialize the project with the above configuration? (Y/n) Y
```

Next let’s add auth with Amazon Cognito as this is required by S3 storage

```bash
amplify add auth
```

Select the following prompts:

```bash
Do you want to use the default authentication and security configuration? Default configuration
How do you want users to be able to sign in? Username
Do you want to configure advanced settings? No, I am done.
```

### Adding a S3 storage resources via Amplify and AWS console

Let’s add an S3 bucket to our application

```bash
amplify add storage
```

Select the Prompts:

```bash
Select Content (Images, audio, video, etc.)
for who should have access, select:  Auth users only
What kind of access do you want for Authenticated users? · create/update, read
```

To create the resources in the cloud, run the following:

```bash
amplify push
```

### Create an S3 bucket on the AWS console

<!-- is this simulating some use case where the bucket is outside the Amplify project? Can this be noted explicitly? -->

![image](https://user-images.githubusercontent.com/87995712/198861774-783a2d71-2402-4f08-8dd8-7f5aad133049.png)

Provide a unique name to your bucket and click create.

### Adding Lambda functions to access S3 storage

We will be creating four functions that will be utilized in the step function.

#### Lambda function to retrieve S3 bucket object names

The function will have access to the Amplify-generated S3 storage that will read the object file names.

Run the command below and select the following prompts

```bash
amplify add function
```

```bash
? Select which capability you want to add: Lambda function (serverless function)
? Provide an AWS Lambda function name: readAmplifyS3
? Choose the runtime that you want to use: NodeJS
? Choose the function template that you want to use: Hello World

Available advanced settings:
- Resource access permissions
- Scheduled recurring invocation
- Lambda layers configuration
- Environment variables configuration
- Secret values configuration

? Do you want to configure advanced settings? Yes
? Do you want to access other resources in this project from your Lambda function? Yes
? Select the categories you want this function to have access to. storage
? Storage has 3 resources in this project. Select the one you would like your Lambda to access  < amplify generated s3 storage>
? Select the operations you want to permit on < amplify generated s3 storage> read
? Do you want to invoke this function on a recurring schedule? No
? Do you want to enable Lambda layers for this function? No
? Do you want to configure environment variables for this function? No
? Do you want to configure secret values this function can access? No
? Do you want to edit the local lambda function now? Yes
```

Add the following code to the generated function

```js
const AWS = require('aws-sdk')
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`)

  var s3 = new AWS.S3()
  var params = {
    // Bucket: process.env.STORAGE_<name of amplify generated s3 storage>_BUCKETNAME,
    Bucket: '<Amplify_generated_bucket>',
    MaxKeys: '100',
  }

  let s3Objects
  let s3Keys

  try {
    s3Objects = await s3.listObjectsV2(params).promise()
    var contents = s3Objects.Contents
    s3Keys = contents.map(function (content) {
      return content.Key
    })
    console.log(s3Objects)
  } catch (e) {
    console.log(e)
  }

  return {
    statusCode: 200,
    body: JSON.stringify(s3Keys || { message: 'No objects found' }),
  }
}
```

Note: Replace the placeholders (`<>`) with the name of the S3 bucket generated in the environment parameters.

#### Lambda function to retrieve AWS console S3 bucket object names

Similar to the function added in the previous step we will add another function without the additional permission to the S3 bucket, and instead provide the permission to the function via `custom-policies.json`

```bash
amplify add function
```

```bash
? Select which capability you want to add: Lambda function (serverless function)
? Provide an AWS Lambda function name: readAwsS3
? Choose the runtime that you want to use: NodeJS
? Choose the function template that you want to use: Hello World

Available advanced settings:
- Resource access permissions
- Scheduled recurring invocation
- Lambda layers configuration
- Environment variables configuration
- Secret values configuration

? Do you want to configure advanced settings? No
? Do you want to edit the local lambda function now? Yes
```

Then add the following code to the `index.js` file.

```js
const AWS = require('aws-sdk')
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`)

  var s3 = new AWS.S3()
  var params = {
    Bucket: '<AWS_console_created_bucket>',
    MaxKeys: '100',
  }

  let s3Objects
  let s3Keys

  try {
    s3Objects = await s3.listObjectsV2(params).promise()
    var contents = s3Objects.Contents
    s3Keys = contents.map(function (content) {
      return content.Key
    })
    console.log(s3Objects)
  } catch (e) {
    console.log(e)
  }

  return {
    statusCode: 200,
    body: JSON.stringify(s3Keys || { message: 'No objects found' }),
  }
}
```

Add the following to the `custom-policies.json` file present in the Lambda function folder.

```json
[
  {
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::<AWS_console_created_bucket>/*",
      "arn:aws:s3:::<AWS_console_created_bucket>"
    ]
  }
]
```

<!-- probably should add the full placeholder name inside the brackets here -->
<!-- should we use the GitHub "Note" feature? -->

Note: Replace the placeholders (`<>`) with the name of the s3 bucket created in the AWS console.

Add the following package to `package.json`

```json
"aws-sdk": "^2.814.0"
```

Note: for this example I will be setting the MaxKeys to 100 for efficiency, the attribute can be set to a maximum of 1,000 key names. A _continuation-token_ (https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html#API_ListObjectsV2_RequestSyntax) can be utilized to retrieve the next 1000 elements .

#### Lambda function to filter S3 keys to Sync

Lets create a Lambda function that takes the output from the two functions above and filters the S3 keys.

```bash
amplify add function
```

```bash
? Select which capability you want to add: Lambda function (serverless function)
? Provide an AWS Lambda function name: filterS3keys
? Choose the runtime that you want to use: NodeJS
? Choose the function template that you want to use: Hello World

Available advanced settings:
- Resource access permissions
- Scheduled recurring invocation
- Lambda layers configuration
- Environment variables configuration
- Secret values configuration

? Do you want to configure advanced settings? No
? Do you want to edit the local lambda function now? Yes
```

Add the following code to the `index.js` file

```js
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  var AmplifyS3keys = JSON.parse(event[0].body)
  var AWSS3keys = JSON.parse(event[1].body)

  const uniqueKeys = AmplifyS3keys.filter((x) => !AWSS3keys.includes(x))
  console.log(uniqueKeys)

  const uniqueKeys1 = AWSS3keys.filter((x) => !AmplifyS3keys.includes(x))
  console.log(uniqueKeys1)

  var result = [uniqueKeys, uniqueKeys1]
  return {
    statusCode: 200,
    body: result,
  }
}
```

#### Lambda function to Sync two S3 buckets

Lets create a function with permissions to both S3 buckets.

```bash
amplify add function
```

```bash
? Select which capability you want to add: Lambda function (serverless function)
? Provide an AWS Lambda function name: syncS3Buckets
? Choose the runtime that you want to use: NodeJS
? Choose the function template that you want to use: Hello World

Available advanced settings:
- Resource access permissions
- Scheduled recurring invocation
- Lambda layers configuration
- Environment variables configuration
- Secret values configuration

? Do you want to configure advanced settings? Yes
? Do you want to access other resources in this project from your Lambda function? Yes
? Select the categories you want this function to have access to. storage
? Storage has 3 resources in this project. Select the one you would like your Lambda to access  < amplify generated s3 storage>
? Select the operations you want to permit on < amplify generated s3 storage> create, read, update
? Do you want to invoke this function on a recurring schedule? No
? Do you want to enable Lambda layers for this function? No
? Do you want to configure environment variables for this function? No
? Do you want to configure secret values this function can access? No
? Do you want to edit the local lambda function now? Yes
```

Add the following code

```js
var AWS = require('aws-sdk')
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  var s3 = new AWS.S3()
  var objectKey = event.body

  async function copytoS3bucket(source, destination, number) {
    if (objectKey[number].length === 0) {
      return 'S3 bucket on Sync'
    }

    var sourceBucket = source
    var destinationBucket = destination
    var content = []

    for (var i = 0; i < objectKey[number].length; i++) {
      var copySource = encodeURI(sourceBucket + '/' + objectKey[number][i])
      var copyParams = {
        Bucket: destinationBucket,
        CopySource: copySource,
        Key: objectKey[number][i],
      }
      var data
      try {
        data = await s3.copyObject(copyParams).promise()
      } catch (e) {
        throw e
      }
      content.push({ Key: objectKey[number][i], Body: 'Copied', Result: data })
    }

    return content
  }

  const res1 = await copytoS3bucket(
    '<Amplify_Created_Bucket>',
    '<AWS_Console_created_bucket>',
    1
  )
  const res2 = await copytoS3bucket(
    '<AWS_Console_created_bucket>',
    '<Amplify_Created_Bucket>',
    0
  )
  return [res1, res2]
}
```

Add the following to the `custom-policies.json` file present in the Lambda function folder.

```json
[
  {
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": [
      "arn:aws:s3:::<Amplify Bucket name>/*",
      "arn:aws:s3:::<Amplify Bucket name>",
      "arn:aws:s3:::<Aws Console Bucket name>/*",
      "arn:aws:s3:::<Aws Console Bucket name>"
    ]
  }
]
```

Note: Replace the placeholders (`<>`) with the name of the s3 bucket generated in the environment parameters.

Run the following command

```bash
amplify push
```

### Adding StepFunction using Amplify custom resource and CDK

Run the command to add a Amplify custom resource.

```bash
amplify add custom
```

```bash
√ How do you want to define this custom resource? · AWS CDK
√ Provide a name for your custom resource · CustomStepfunction
√ Do you want to edit the CDK stack now? (Y/n) · yes
```

Run the command to add a AWS StepFunction, IAM, and Lambda function CDK libraries

```bash
cd amplify/backend/custom/CustomStepfunction
npm install aws-cdk-lib
```

Now lets create the StepFunction resource and utilize the resources created in Amplify

In `cdk-stack.ts` add the following

```ts
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
          { category: 'function', resourceName: 'readAmplifyS3' },
          { category: 'function', resourceName: 'readAwsS3' },
          { category: 'function', resourceName: 'filterS3keys' },
          { category: 'function', resourceName: 'syncS3Buckets' },
        ]
      )

    // import Lamdba functions
    const readAmplifyS3Arn = cdk.Fn.ref(retVal.function.readAmplifyS3.Arn)
    const readAmplifyS3 = lambda.Function.fromFunctionArn(
      this,
      'readAmplifyS3',
      readAmplifyS3Arn
    )

    const readAwsS3Arn = cdk.Fn.ref(retVal.function.readAwsS3.Arn)
    const readAwsS3 = lambda.Function.fromFunctionArn(
      this,
      'readAwsS3',
      readAwsS3Arn
    )

    const filterS3keysArn = cdk.Fn.ref(retVal.function.filterS3keys.Arn)
    const filterS3keys = lambda.Function.fromFunctionArn(
      this,
      'filterS3keys',
      filterS3keysArn
    )

    const syncS3BucketsArn = cdk.Fn.ref(retVal.function.syncS3Buckets.Arn)
    const syncS3Buckets = lambda.Function.fromFunctionArn(
      this,
      'syncS3Buckets',
      syncS3BucketsArn
    )

    // create tasks for StepFunction
    const getAWSkeysTask = new tasks.LambdaInvoke(this, 'getAWSkeystask', {
      lambdaFunction: readAwsS3,
      payloadResponseOnly: true,
    })

    const getAmplifykeysTask = new tasks.LambdaInvoke(
      this,
      'getAmplifykeystask',
      {
        lambdaFunction: readAmplifyS3,
        payloadResponseOnly: true,
      }
    )

    const compareKeysTask = new tasks.LambdaInvoke(this, 'compareKeysTask', {
      lambdaFunction: filterS3keys,
      payloadResponseOnly: true,
    })

    const s3syncTask = new tasks.LambdaInvoke(this, 's3syncTask', {
      lambdaFunction: syncS3Buckets,
      payloadResponseOnly: true,
    }).next(new sfn.Succeed(this, 'Done'))

    const serviceRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.AccountRootPrincipal(),
    })

    // create a StepFunction flow
    const definition = new sfn.Parallel(this, 'ParallelTask', {})
      .branch(getAWSkeysTask)
      .branch(getAmplifykeysTask)
      .next(compareKeysTask)
      .next(s3syncTask)

    // define State machine
    const stateMachine = new sfn.StateMachine(this, 'SyncStateMachine', {
      definition: definition,
      role: serviceRole,
    })
  }
}
```

Great, we are now done.

As we are utlizing a Amplify user with `AdministratorAccess-Amplify` permssions. we will need to add additional permissions.
We can add permissions by

1. Selecting the Amplify CLI IAM user then click on `Add permissions`.
2. Select `Attach existing policies directly`
3. Search for `AWSStepFunctionsFullAccess`. (Note: depending on your use case please add permissions to restrict access to resources needed)
4. Then click `Next` and `Add Permissions`.

#### Let’s push the applications

Run the command

```bash
amplify push
```

### Test the application on AWS console

Let's first upload some objects to the S3 buckets.

1. Open the S3 bucket created by Amplify using add storage and upload a file. Also upload a different file with a different key name to the AWS console created S3 bucket
2. In a browser open the AWS console and Select StepFunctions as the service.
3. Next, select the State Machine that was created.
4. Select the “Start Execution” button present and on the popup “Start Execution” again.

Observe the following flow on the window. The flow should start and end with a green flow

![image](https://user-images.githubusercontent.com/87995712/199571078-d0b80a5a-8bf8-45ba-92cd-d7507d0c2057.png)

Once the the flow finishes, check the S3 buckets. we will observe the objects have been created with the key name upload to the other bucket.
To confirm if the file has been copied successfully, download and open the file.

### Note

If you observe the following error when testing from console

```error
The principal states.amazonaws.com is not authorized to assume the provided role.
```

We will need to add principal in assume policy for the role being used

Open the role attached to the StepFunctions, we can find this in the StepFunction console on selecting state machine.
On opening the role in IAM console, click on `Trust relationships` then `edit trust policy`

add the following

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account ID>:root",
        "Service": "states.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Additionally, refer to the [AWS sample](https://github.com/aws-samples/sync-buckets-state-machine) providing a full example on Syncing two S3 buckets.
The example can also be utilized when working with Amplify and AWS CDK v1, and will require appropriate packages to work.
