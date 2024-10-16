import * as cdk from "aws-cdk-lib"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment"
import * as iam from "aws-cdk-lib/aws-iam"
import { readFileSync } from "fs"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as s3n from "aws-cdk-lib/aws-s3-notifications"

export interface ApiDocsCdkStackProps extends cdk.StackProps {}

/**
 * api-docs
 */
export class ApiDocsCdkStack extends cdk.Stack {
  /**
   * Server Public IP
   */
  public readonly publicIp

  public constructor(
    scope: cdk.App,
    id: string,
    props: ApiDocsCdkStackProps = {}
  ) {
    super(scope, id, props)
    //const repo = this.node.tryGetContext("REPO")

    // Resources
    const apiDocsEc2SecurityGroup = new ec2.CfnSecurityGroup(
      this,
      "ApiDocsEC2SecurityGroup",
      {
        groupName: "api-docs-security-group",
        tags: [
          {
            key: "Name",
            value: "api-docs-security-group",
          },
        ],
        groupDescription:
          "Allow HTTP/HTTPS and SSH inbound and outbound traffic",
        securityGroupIngress: [
          {
            ipProtocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 8001,
            toPort: 8001,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 8080,
            toPort: 8080,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 4010,
            toPort: 4010,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 22,
            toPort: 22,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 5000,
            toPort: 5000,
            cidrIp: "0.0.0.0/0",
          },
          {
            ipProtocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrIp: "0.0.0.0/0",
          },
        ],
      }
    )

    const apiDocsOAS = new s3.Bucket(this, "ApiDocsAppOAS", {
      bucketName: "api-docs-oas",
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Simple Lambda function that triggers when a new object is uploaded to the S3 bucket
    const lambdaFunction = new lambda.Function(this, "S3ObjectUploadHandler", {
      runtime: lambda.Runtime.NODEJS_16_X, // Lambda execution runtime
      handler: "syncOASS3ToEC2.handler", // Points to the handler in the Lambda code
      code: lambda.Code.fromAsset("lambda"),
    })
    // Grant Lambda permission to send SSM commands and access the S3 bucket
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ssm:SendCommand"],
        resources: ["*"], // You can restrict this to your EC2 instance
      })
    )

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [apiDocsOAS.bucketArn + "/*"], // Allow access to objects in the S3 bucket
      })
    )

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ec2:DescribeInstances"],
        resources: ["*"], // Allow the Lambda function to describe EC2 instances
      })
    )
    apiDocsOAS.grantRead(lambdaFunction)

    // Add event notification for when a new object is created in the S3 bucket
    apiDocsOAS.addEventNotification(
      s3.EventType.OBJECT_CREATED, // React to new object creation
      new s3n.LambdaDestination(lambdaFunction) // Trigger the Lambda function
    )

    const apiDocsAppData = new s3.Bucket(this, "ApiDocsAppData", {
      bucketName: "api-docs-app-data",
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const apiDocsAppDataDeployment = new s3Deployment.BucketDeployment(
      this,
      "ApiDocsAppDataDeployment",
      {
        sources: [s3Deployment.Source.asset("./app")],
        destinationBucket: apiDocsAppData,
      }
    )

    const apiDocsEc2Role = new iam.CfnRole(this, "ApiDocsEc2Role", {
      assumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "ec2.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      },
      roleName: "api-docs-ec2-role",
      description: "Allows EC2 instances to call AWS services on your behalf.",
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEC2FullAccess",
        "arn:aws:iam::aws:policy/AmazonS3FullAccess",
        "arn:aws:iam::aws:policy/AmazonSSMFullAccess",
      ],
      tags: [
        {
          key: "Name",
          value: "api-docs-ec2-role",
        },
      ],
    })

    const apiDocsEc2InstanceProfile = new iam.CfnInstanceProfile(
      this,
      "ApiDocsEc2InstanceProfile",
      {
        instanceProfileName: "api-docs-ec2-instance-profile",
        roles: [apiDocsEc2Role.ref],
      }
    )

    const apiDocsEc2Instance = new ec2.CfnInstance(this, "ApiDocsEC2Instance", {
      imageId: "ami-065674f0cb1db636b",
      instanceType: "t2.micro",
      keyName: "api-docs",
      securityGroupIds: [apiDocsEc2SecurityGroup.ref],
      iamInstanceProfile: apiDocsEc2InstanceProfile.ref,
      userData: readFileSync("./lib/user-data.sh", "base64"),
      /*userData: Buffer.from(
        readFileSync("./lib/user-data.sh", "utf-8").replace("_REPO_", repo)
      ).toString("base64"),*/
      tags: [
        {
          key: "Name",
          value: "api-docs-ec2-instance",
        },
      ],
    })

    apiDocsEc2Instance.node.addDependency(apiDocsAppDataDeployment)

    // Outputs
    this.publicIp = apiDocsEc2Instance.attrPublicIp
    new cdk.CfnOutput(this, "CfnOutputPublicIp", {
      key: "PublicIp",
      description: "Server Public IP",
      exportName: `${this.stackName}-public-ip`,
      value: this.publicIp!.toString(),
    })
  }
}
