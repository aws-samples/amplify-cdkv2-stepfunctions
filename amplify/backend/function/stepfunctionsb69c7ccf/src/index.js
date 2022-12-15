/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_S3AA3B2BA2_BUCKETNAME
Amplify Params - DO NOT EDIT */


const AWS = require('aws-sdk');
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    var s3 = new AWS.S3();
    var params = {
      Bucket: process.env.STORAGE_S3AA3B2BA2_BUCKETNAME,
      MaxKeys: "100",
    };
    
    let s3Objects;
    let s3Keys;

    try{
        s3Objects = await s3.listObjectsV2(params).promise();
        var contents = s3Objects.Contents;
        s3Keys = contents.map(function(content) { return content.Key; });
        console.log(s3Objects);
    }
    catch(e){
        console.log(e);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(s3Keys || {message: "No objects found"}),
    };

};
