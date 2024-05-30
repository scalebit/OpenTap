@echo off
setlocal

:: 设定比特币数据目录
set "BITCOIN_DATA_DIR=%USERPROFILE%\.bitcoin"

:: 创建比特币配置目录和文件
if not exist "%BITCOIN_DATA_DIR%" (
    mkdir "%BITCOIN_DATA_DIR%"
)

:: 创建bitcoin.conf配置文件
(
    echo regtest=1
    echo listen=0
    echo server=1
    echo txindex=1
    echo fallbackfee=0.000001
    echo minrelaytxfee=0
    echo [regtest]
    echo rpcuser=user
    echo rpcpassword=pass
    echo rpcclienttimeout=30
    echo rpcallowip=0.0.0.0/0
    echo rpcport=18443
    echo printtoconsole=1
    echo dbcache=512
) > "%BITCOIN_DATA_DIR%\bitcoin.conf"

:: 启动bitcoind进程
start "" bitcoind -datadir="%BITCOIN_DATA_DIR%"

:: 等待bitcoind启动
timeout /t 5

:: 创建并加载钱包
bitcoin-cli -regtest -datadir="%BITCOIN_DATA_DIR%" createwallet main
bitcoin-cli -regtest -datadir="%BITCOIN_DATA_DIR%" loadwallet main

:: 获取新地址
for /f "tokens=*" %%i in ('bitcoin-cli -regtest -datadir="%BITCOIN_DATA_DIR%" getnewaddress') do set NEW_ADDRESS=%%i

:: 生成一些区块以便在regtest模式下进行测试
bitcoin-cli -regtest -datadir="%BITCOIN_DATA_DIR%" -rpcwallet=main generatetoaddress 101 %NEW_ADDRESS%

echo bitcoind 已经在 regtest 模式下启动并初始化了一些区块。

endlocal
pause