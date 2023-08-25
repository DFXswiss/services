"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getInfosForContractMethod = void 0;

var _ethereum = _interopRequireDefault(require("@ledgerhq/cryptoassets/data/dapps/ethereum"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Retrieve the metadatas a given contract address and a method selector
 */
const getInfosForContractMethod = (contractAddress, selector) => {
  const lcSelector = selector.toLowerCase();
  const lcContractAddress = contractAddress.toLowerCase();

  if (lcContractAddress in _ethereum.default) {
    const contractSelectors = _ethereum.default[lcContractAddress];

    if (lcSelector in contractSelectors) {
      return {
        payload: contractSelectors[lcSelector]["serialized_data"],
        signature: contractSelectors[lcSelector]["signature"],
        plugin: contractSelectors[lcSelector]["plugin"],
        erc20OfInterest: contractSelectors[lcSelector]["erc20OfInterest"],
        abi: contractSelectors["abi"]
      };
    }
  }
};

exports.getInfosForContractMethod = getInfosForContractMethod;
//# sourceMappingURL=contracts.js.map