<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class InvalidStateException extends HttpException
{
    /**
     * Create a new InvalidStateException instance.
     */
    public function __construct(string $message = 'Operasi tidak diizinkan pada status request saat ini.')
    {
        parent::__construct(409, $message);
    }
}
