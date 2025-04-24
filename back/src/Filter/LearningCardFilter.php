<?php

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class LearningCardFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        Operation $operation = null,
        array $context = []
    ): void {
        if (!in_array($property, ['theme', 'niveau'])) {
            return;
        }

        $parameterName = $queryNameGenerator->generateParameterName($property);
        $queryBuilder
            ->andWhere(sprintf('o.%s = :%s', $property, $parameterName))
            ->setParameter($parameterName, $value);
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'theme' => [
                'property' => 'theme',
                'type' => 'string',
                'required' => false,
                'swagger' => [
                    'description' => 'Filtrer par thème',
                    'name' => 'theme',
                    'type' => 'string',
                ],
            ],
            'niveau' => [
                'property' => 'niveau',
                'type' => 'string',
                'required' => false,
                'swagger' => [
                    'description' => 'Filtrer par niveau',
                    'name' => 'niveau',
                    'type' => 'string',
                ],
            ],
        ];
    }
} 