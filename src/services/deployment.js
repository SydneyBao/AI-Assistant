const deploymentEndpoint = import.meta.env.VITE_DEPLOY_API_URL;

export const deployProfile = async (profile) => {
  if (!profile.deploymentUrl) {
    return { status: "not-requested", message: "Assistant created locally." };
  }

  if (!deploymentEndpoint) {
    return {
      status: "needs-configuration",
      message: `Assistant saved locally. Connect a deployment service to publish at ${profile.deploymentUrl}.`,
    };
  }

  const response = await fetch(deploymentEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetUrl: profile.deploymentUrl,
      profile: {
        name: profile.name,
        summary: profile.summary,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        websiteUrl: profile.websiteUrl,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Deployment failed with status ${response.status}.`);
  }

  const result = await response.json().catch(() => ({}));
  return {
    status: "deployed",
    url: result.url || profile.deploymentUrl,
    message: `Assistant published at ${result.url || profile.deploymentUrl}.`,
  };
};
