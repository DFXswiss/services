/**
 * Test MetaMask EIP-5792 Capabilities
 *
 * This script injects into a browser page to check what wallet_getCapabilities returns.
 * Run after MetaMask is connected.
 */

const checkCapabilities = async () => {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    console.error('MetaMask not installed');
    return;
  }

  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    console.log('Connected account:', accounts[0]);

    const capabilities = await ethereum.request({
      method: 'wallet_getCapabilities',
      params: [accounts[0]],
    });

    console.log('=== wallet_getCapabilities ===');
    console.log(JSON.stringify(capabilities, null, 2));

    // Check Sepolia (chainId 11155111 = 0xaa36a7)
    const sepoliaHex = '0xaa36a7';
    const sepoliaCapabilities = capabilities?.[sepoliaHex];

    console.log('\n=== Sepolia Capabilities ===');
    console.log('atomic:', sepoliaCapabilities?.atomic);
    console.log('paymasterService:', sepoliaCapabilities?.paymasterService);

    if (sepoliaCapabilities?.paymasterService?.supported) {
      console.log('✓ paymasterService is SUPPORTED on Sepolia');
    } else {
      console.log('✗ paymasterService is NOT supported on Sepolia');
      console.log('User may need to upgrade to Smart Account first');
    }

    if (sepoliaCapabilities?.atomic?.status === 'ready') {
      console.log('→ Status "ready": MetaMask will prompt to upgrade to Smart Account');
    } else if (sepoliaCapabilities?.atomic?.status === 'supported') {
      console.log('→ Status "supported": Smart Account already active');
    }

  } catch (e: any) {
    console.error('Error:', e.message || e);
  }
};

// Export for use in browser console
(window as any).checkCapabilities = checkCapabilities;
console.log('Run checkCapabilities() to test');
