<?php

namespace App\Repository;

use App\Entity\QuestionOption;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<QuestionOption>
 *
 * @method QuestionOption|null find($id, $lockMode = null, $lockVersion = null)
 * @method QuestionOption|null findOneBy(array $criteria, array $orderBy = null)
 * @method QuestionOption[]    findAll()
 * @method QuestionOption[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class QuestionOptionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, QuestionOption::class);
    }
} 