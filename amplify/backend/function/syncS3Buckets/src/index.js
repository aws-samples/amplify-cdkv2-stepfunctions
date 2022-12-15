/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_S3AA3B2BA2_BUCKETNAME
Amplify Params - DO NOT EDIT */

var AWS = require("aws-sdk");
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  var s3 = new AWS.S3();
  var objectKey = event.body;

  async function copytoS3bucket(source, destination, number) {
    if (objectKey[number].length === 0) {
      return "S3 bucket on Sync";
    }

    var sourceBucket = source;
    var destinationBucket = destination;
    var content = [];

    for (var i = 0; i < objectKey[number].length; i++) {
      var copySource = encodeURI(sourceBucket + "/" + objectKey[number][i]);
      var copyParams = {
        Bucket: destinationBucket,
        CopySource: copySource,
        Key: objectKey[number][i],
      };
      var data;
      try {
        data = await s3.copyObject(copyParams).promise();
      } catch (e) {
        throw e;
      }
      content.push({ Key: objectKey[number][i], Body: "Copied", Result: data });
    }

    return content;
  }

  const res1 = await copytoS3bucket(
    process.env.STORAGE_S3AA3B2BA2_BUCKETNAME,
    "amplifybackuptest",
    0
  );
  const res2 = await copytoS3bucket(
    "amplifybackuptest",
    process.env.STORAGE_S3AA3B2BA2_BUCKETNAME,
    1
  );
  return [res1, res2];
};
