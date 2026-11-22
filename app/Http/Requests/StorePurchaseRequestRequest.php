<?php

namespace App\Http\Requests;

use App\Enums\RequestPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StorePurchaseRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'priority' => ['nullable', new Enum(RequestPriority::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.name' => ['required', 'string', 'min:1', 'max:200'],
            'items.*.uom' => ['nullable', 'string', 'max:50'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'gt:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Minimal 1 item diperlukan.',
            'items.min' => 'Minimal 1 item diperlukan.',
            'items.max' => 'Maksimal 100 item per request.',
            'items.*.name.required' => 'Nama item wajib diisi.',
            'items.*.name.max' => 'Nama item maksimal 200 karakter.',
            'items.*.qty.required' => 'Jumlah item wajib diisi.',
            'items.*.qty.min' => 'Jumlah item minimal 1.',
            'items.*.qty.max' => 'Jumlah item maksimal 9.999.',
            'items.*.unit_price.required' => 'Harga satuan wajib diisi.',
            'items.*.unit_price.min' => 'Harga satuan harus lebih besar dari 0.',
            'items.*.unit_price.max' => 'Harga satuan maksimal Rp 1.000.000.000.',
        ];
    }
}
