import * as cdk from "aws-cdk-lib"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment"
import * as iam from "aws-cdk-lib/aws-iam"
import { readFileSync } from "fs"
/* import * as s3n from "aws-cdk-lib/aws-s3-notifications"
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources"*/
import * as lambda from "aws-cdk-lib/aws-lambda"

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

    const apiDocsS3Bucket = new s3.CfnBucket(this, "ApiDocsS3Bucket", {
      bucketName: "api-docs-s3-bucket",
      publicAccessBlockConfiguration: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    })

    const apiDocsS3BucketPolicy = new s3.CfnBucketPolicy(
      this,
      "ApiDocsS3BucketPolicy",
      {
        bucket: apiDocsS3Bucket.ref,
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: "s3:GetObject",
              Resource: ["arn:aws:s3:::", apiDocsS3Bucket.ref, "/*"].join(""),
            },
          ],
        },
      }
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
