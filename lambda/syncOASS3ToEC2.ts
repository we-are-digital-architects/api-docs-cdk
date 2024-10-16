const AWS = require("aws-sdk")
const ssm = new AWS.SSM()
const ec2 = new AWS.EC2()

exports.handler = async (event: any) => {
  console.log("S3 Event Received:", JSON.stringify(event, null, 2))

  // Retrieve instance IDs by filtering based on tag
  const params = {
    Filters: [
      { Name: "tag:Name", Values: ["api-docs-ec2-instance"] },
      { Name: "instance-state-name", Values: ["running"] },
    ],
  }

  try {
    const ec2Data = await ec2.describeInstances(params).promise()
    const instanceIds = ec2Data.Reservations.flatMap((reservation: any) =>
      reservation.Instances.map((instance: any) => instance.InstanceId)
    )

    if (instanceIds.length === 0) {
      console.error("No running instances found with the specified tag.")
      return
    }

    // Define the SSM command to sync the S3 bucket with the EC2 directory
    const ssmParams = {
      DocumentName: "AWS-RunShellScript",
      InstanceIds: instanceIds, // Use the retrieved instance IDs
      Parameters: {
        commands: [
          "aws s3 sync s3://api-docs-oas /home/ec2-user/app/app/oas",
          "docker stop $(docker ps -a -q)",
          "cd /home/ec2-user/app && make init && docker-compose up --build",
        ],
      },
    }

    // Trigger the SSM command
    const result = await ssm.sendCommand(ssmParams).promise()
    console.log("SSM Command Sent", result)
  } catch (err) {
    console.error("Error fetching instance IDs or sending SSM command", err)
  }
}
