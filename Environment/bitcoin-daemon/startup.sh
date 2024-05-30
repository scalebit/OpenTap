#!/bin/bash

# 设定比特币数据目录
BITCOIN_DATA_DIR="$HOME/.bitcoin"

# 创建比特币配置目录和文件
mkdir -p "$BITCOIN_DATA_DIR"

# 创建bitcoin.conf配置文件
cat <<EOF > "$BITCOIN_DATA_DIR/bitcoin.conf"
regtest=1
listen=0
server=1
txindex=1
fallbackfee=0.000001
minrelaytxfee=0
[regtest]
rpcuser=user
rpcpassword=pass
rpcclienttimeout=30
rpcallowip=0.0.0.0/0
rpcport=18443
printtoconsole=1
dbcache=512
EOF

# 启动bitcoind进程
bitcoind -datadir="$BITCOIN_DATA_DIR"

# 等待bitcoind启动
sleep 5

# 创建并加载钱包
bitcoin-cli -regtest -datadir="$BITCOIN_DATA_DIR" createwallet main
bitcoin-cli -regtest -datadir="$BITCOIN_DATA_DIR" loadwallet main

# 获取新地址
NEW_ADDRESS=$(bitcoin-cli -regtest -datadir="$BITCOIN_DATA_DIR" getnewaddress)

# 生成一些区块以便在regtest模式下进行测试
bitcoin-cli -regtest -datadir="$BITCOIN_DATA_DIR" -rpcwallet=main generatetoaddress 101 "$NEW_ADDRESS"

echo "bitcoind 已经在 regtest 模式下启动并初始化了一些区块。"