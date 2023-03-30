// --- PARAMETERS --- //
param location string
param env string
param systemName string

// --- VARIABLES --- //
var cdnProfileName = 'cdnp-${systemName}-${env}'
var cdnEndpointName = 'cdne-${systemName}-${env}'
var storageAccountName = replace('st-${systemName}-${env}', '-', '')
var siteHostName = '${storageAccountName}.z6.web.${environment().suffixes.storage}'

// --- RESOURCES --- //
resource cdnProfile 'Microsoft.Cdn/profiles@2020-09-01' = {
  name: cdnProfileName
  location: 'Global'
  sku: {
    name: 'Standard_Microsoft'
  }
}

resource cdnEndpoint 'Microsoft.Cdn/profiles/endpoints@2020-09-01' = {
  parent: cdnProfile
  name: cdnEndpointName
  location: 'Global'
  properties: {
    origins: [
      {
        name: replace(siteHostName, '.', '-')
        properties: {
          hostName: siteHostName
          httpPort: 80
          httpsPort: 443
          originHostHeader: siteHostName
          priority: 1
          weight: 1000
          enabled: true
        }
      }
    ]
    deliveryPolicy: {
      rules: [
        {
          name: 'HttpToHttps'
          order: 1
          conditions: [
            {
              name: 'RequestScheme'
              parameters: {
                matchValues: [
                  'HTTP'
                ]
                operator: 'Equal'
                negateCondition: false
                '@odata.type': '#Microsoft.Azure.Cdn.Models.DeliveryRuleRequestSchemeConditionParameters'
              }
            }
          ]
          actions: [
            {
              name: 'UrlRedirect'
              parameters: {
                redirectType: 'Found'
                destinationProtocol: 'Https'
                '@odata.type': '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlRedirectActionParameters'
              }
            }
          ]
        }
        {
          name: 'SpaRewriteRule'
          order: 2
          conditions: [
            {
              name: 'UrlFileExtension'
              parameters: {
                operator: 'LessThan'
                negateCondition: false
                matchValues: [
                  '1'
                ]
                transforms: []
                '@odata.type': '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlFileExtensionMatchConditionParameters'
              }
            }
          ]
          actions: [
            {
              name: 'UrlRewrite'
              parameters: {
                sourcePattern: '/'
                destination: '/index.html'
                preserveUnmatchedPath: false
                '@odata.type': '#Microsoft.Azure.Cdn.Models.DeliveryRuleUrlRewriteActionParameters'
              }
            }
          ]
        }
      ]
    }
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    allowSharedKeyAccess: true
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}
