const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create a VPC
const vpc = new aws.ec2.Vpc("k3s-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: "k3s-vpc" },
});
exports.vpcId = vpc.id;

// Create a public subnet
const publicSubnet = new aws.ec2.Subnet("k3s-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "ap-southeast-1a",
    mapPublicIpOnLaunch: true,
    tags: { Name: "k3s-subnet" },
});
exports.publicSubnetId = publicSubnet.id;

// Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("k3s-igw", {
    vpcId: vpc.id,
    tags: { Name: "k3s-igw" },
});
exports.igwId = internetGateway.id;

// Route Table
const publicRouteTable = new aws.ec2.RouteTable("k3s-rt", {
    vpcId: vpc.id,
    tags: { Name: "k3s-rt" },
});
exports.publicRouteTableId = publicRouteTable.id;

new aws.ec2.Route("igw-route", {
    routeTableId: publicRouteTable.id,
    destinationCidrBlock: "0.0.0.0/0",
    gatewayId: internetGateway.id,
});

new aws.ec2.RouteTableAssociation("rt-association", {
    subnetId: publicSubnet.id,
    routeTableId: publicRouteTable.id,
});

// Security Group
const k3sSecurityGroup = new aws.ec2.SecurityGroup("k3s-secgrp", {
    vpcId: vpc.id,
    description: "Allow SSH and K3s traffic",
    ingress: [
        { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
        // { protocol: "tcp", fromPort: 6443, toPort: 6443, cidrBlocks: ["0.0.0.0/0"] },
            // Allow Kubernetes API access
        {
            protocol: "tcp",
            fromPort: 6443,
            toPort: 6443,
            cidrBlocks: ["0.0.0.0/0"], // Replace with your trusted IP or CIDR block
            description: "Kubernetes API access",
        },
        // Allow Docker Daemon access (internal only)
        {
            protocol: "tcp",
            fromPort: 2375,
            toPort: 2375,
            cidrBlocks: ["0.0.0.0/0"], // Restrict to localhost (internal traffic only)
            description: "Docker daemon (non-secure)",
        },
        // Allow Node-to-Node communication for Kubernetes
        {
            protocol: "tcp",
            fromPort: 10250,
            toPort: 10250,
            cidrBlocks: ["0.0.0.0/0"], // Adjust to your cluster network
            description: "Kubelet API",
        },
        {
            protocol: "udp",
            fromPort: 8472,
            toPort: 8472,
            cidrBlocks: ["0.0.0.0/0"], // Adjust to your cluster network
            description: "Flannel VXLAN traffic",
        },
        // Allow NodePort services
        {
            protocol: "tcp",
            fromPort: 30000,
            toPort: 32767,
            cidrBlocks: ["0.0.0.0/0"], // Public or specific access as needed
            description: "NodePort services",
        },
        // Allow DNS resolution
        {
            protocol: "udp",
            fromPort: 53,
            toPort: 53,
            cidrBlocks: ["0.0.0.0/0"], // Adjust to your needs
            description: "DNS resolution",
        }, 
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Name: "k3s-secgrp" },
});
exports.k3sSecurityGroupId = k3sSecurityGroup.id;

// AMI and Instances
const amiId = "ami-01811d4912b4ccb26"; // Ubuntu 24.04 LTS
const createInstance = (name) => new aws.ec2.Instance(name, {
    instanceType: "t3.small",
    vpcSecurityGroupIds: [k3sSecurityGroup.id],
    ami: amiId,
    subnetId: publicSubnet.id,
    keyName: "MyKeyPair",
    associatePublicIpAddress: true,
    tags: { Name: name, Environment: "Development", Project: "K3sSetup" },
});

const masterNode = createInstance("k3s-master-node");
const workerNode1 = createInstance("k3s-worker-node-1");
const workerNode2 = createInstance("k3s-worker-node-2");

exports.masterNodeDetails = { id: masterNode.id, publicIp: masterNode.publicIp };
exports.workerNode1Details = { id: workerNode1.id, publicIp: workerNode1.publicIp };
exports.workerNode2Details = { id: workerNode2.id, publicIp: workerNode2.publicIp };