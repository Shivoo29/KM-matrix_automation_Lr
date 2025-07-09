{ pkgs ? import <nixpkgs> {} }:

with pkgs;
let
  pythonEnv = python3.withPackages (ps: with ps; [
    setuptools
    pip
    distutils-extra
    selenium
  ]);
in
mkShell {
  buildInputs = [
    pythonEnv
  ];
  shellHook = ''
    export NIXPKGS_ALLOW_INSECURE=1
  '';
}
