# -*- coding: utf-8 -*-

"""Console script for infovis21."""
import sys
import typing

import click


@click.command()
def main() -> int:
    """ Console script for infovis21.
        Here, other useful tasks can be performed with cli arguments such as processing data etc
    """
    return 0


if __name__ == "__main__":
    sys.exit(main())  # pragma: no cover
