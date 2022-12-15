

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    var AmplifyS3keys = JSON.parse(event[0].body);
    var AWSS3keys = JSON.parse(event[1].body);

    const uniqueKeys = AmplifyS3keys.filter((x) => !AWSS3keys.includes(x));
    console.log(uniqueKeys);
    
    const uniqueKeys1 = AWSS3keys.filter((x) => !AmplifyS3keys.includes(x));
    console.log(uniqueKeys1)
    
    var result = [uniqueKeys, uniqueKeys1]
    return {
        statusCode: 200, 
        body: result,
    };
};
