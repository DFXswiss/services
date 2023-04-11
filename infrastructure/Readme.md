# Infrastructure Deployment

1. Do deployment: `az deployment group create -g rg-dfx-srv-{env} -f infrastructure/dfx-services.bicep -p infrastructure/parameters/{env}.json`
1. Only on first deployment
   1. Activate static website
      - Azure Portal -> Storage account -> Static website -> Enabled
      - Index/error document path: `index.html`
   1. Add a custom domain
      - Azure Portal -> Endpoint -> Custom domains
      - Create CNAME record in DNS service
   1. Configure HTTPS
      - Open custom domain created in previous step
      - Turn on (CDN managed)
