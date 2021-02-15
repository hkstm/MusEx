#!/usr/bin/env python
# -*- coding: utf-8 -*-

import typing

import pytest
from click.testing import CliRunner

from infovis21 import cli


@pytest.fixture
def response() -> None:
    """Sample pytest fixture.
    See more at: http://doc.pytest.org/en/latest/fixture.html
    """
    pass


def test_content(response: typing.Any) -> None:
    """Sample pytest test function with the pytest fixture as an argument."""
    pass
